/** A class for generating PKCE flow data. */
export class PKCE {
  static escape(str) {
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  static createVerifier() {
    var data = new Uint8Array(32);
    window.crypto.getRandomValues(data);
    return PKCE.escape(btoa(String.fromCharCode(...new Uint8Array(data))));
  }

  static async createChallenge(code) {
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))
      .then(buffer => String.fromCharCode(...new Uint8Array(buffer)))
      .then(x => btoa(x))
      .then(x => PKCE.escape(x));
  }
}

/** A class for simple operations with JOSE objects. */
export class JOSE {
  constructor(header, body) {
    this._header = header;
    this._body = body;
  }
  get header() {
    return this._header;
  }

  get body() {
    return this._body;
  }

  serialize() {
    return JOSE.objectToBase64(this.header) + '.' + JOSE.objectToBase64(this.body);
  }

  static objectToBase64(value) {
    return btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  static parse(token) {
    const [header, body, ...rest] = token.split(/\./);
    return new JOSE(JSON.parse(JOSE.decode(header)), JSON.parse(JOSE.decode(body)));
  }

  static decode(value) {
    return atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  }

  static algorithm(jwk) {
    if (jwk.kty === 'EC') {
      return {
        name: 'ECDSA',
        namedCurve: jwk.crv };
    }
    throw new Error(`Not a supported algorithm type: [${jwk.kty}]`);
  }

  static params(alg) {
    if (alg === 'ES256') {
      return {
        name: 'ECDSA',
        hash: 'SHA-256'
      };
    }
    throw new Error(`Not a supported algorithm type: [${alg}]`);
  }

  static async validate(token) {
    const encoder = new TextEncoder();
    const t = JOSE.parse(token);
    const payload = token.split('.').slice(0, 2).join('.');
    const signature = token.split('.')[2];
    const openid = new OpenId(t.body.iss);
    return openid.metadata().then(metadata => metadata.jwks_uri)
      .then(uri => fetch(uri))
      .then(res => res.json())
      .then(jwks => jwks.keys.filter(key => key.alg === t.header.alg && key.kid === t.header.kid)[0])
      .then(jwk => crypto.subtle.importKey('jwk', jwk, JOSE.algorithm(jwk), false, ['verify']))
      .then(key => crypto.subtle.verify(JOSE.params(t.header.alg), key, Uint8Array.from(JOSE.decode(signature), c => c.charCodeAt(0)), encoder.encode(payload)))
  }
}

/** A class for creating DPoP tokens. */
export class DPoP {
  #encoder;
  #key;

  constructor(key) {
    this.#key = key;
    this.#encoder = new TextEncoder('utf-8');
  }

  async generateToken(htu, htm) {
    const jwk = await crypto.subtle.exportKey('jwk', this.#key.publicKey);
    const algorithm = DPoP.algorithm(jwk);

    // Construct header
    const algName = jwk.kty[0] + 'S' + algorithm.hash.name.substring(4);
    const header = {
      alg: algName.toUpperCase(),
      typ:'dpop+jwt',
      jwk: jwk
    }

    // Construct body
    const rand = new Uint32Array(1);
    crypto.getRandomValues(rand);
    const body = {
      jti: DPoP.stringToBase64(rand[0]),
      htm: htm,
      htu: htu,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 5)
    }

    const jose = new JOSE(header, body).serialize();
    return window.crypto.subtle.sign(algorithm, this.#key.privateKey, this.#encoder.encode(jose))
      .then(buffer => DPoP.arrayBufferToString(buffer))
      .then(signature => `${jose}.${DPoP.stringToBase64(signature)}`);
  }

  static algorithm(jwk) {
    if (jwk.kty === 'EC') {
      const alg = { name: 'ECDSA' };
      if (jwk.crv === 'P-256') {
        alg['hash'] = { name: 'SHA-256' };
      } else if (jwk.crv === 'P-384') {
        alg['hash'] = { name: 'SHA-384' };
      } else if (jwk.crv === 'P-521') {
        alg['hash'] = { name: 'SHA-512' };
      } else {
        throw new Error(`Invalid ECDSA curve: [${jwk.crv}]`);
      }
      return alg;
    }
    throw new Error(`Not a supported algorithm type: [${jwk.kty}]`);
  }

  static stringToBase64(str) {
    return btoa(str).replace(/=+$/, '');
  }

  static arrayBufferToString(buffer) {
    return String.fromCharCode.apply(null, new Uint8Array(buffer));
  }
}

/** A class for handling OpenID Connect interactions. */
export class OpenId {
  constructor(issuer) {
    this.issuer = issuer;
  }

  async metadata() {
    const resource = this.issuer + (this.issuer.endsWith('/') ? '' : '/') + '.well-known/openid-configuration';
    return fetch(resource).then(res => res.json())
      .catch(err => {
        throw 'Unable to deserialize .well-known configuration';
      });
  }

  async authorize(clientId, redirectUri, method, challenge) {
    return this.metadata().then(metadata => {
      const params = {
        response_type: 'code',
        scope: 'openid webid',
        code_challenge: challenge,
        code_challenge_method: method,
        client_id: clientId,
        redirect_uri: redirectUri
      };

      return metadata.authorization_endpoint + '?' + Object.keys(params)
        .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
        .join('&');
    });
  }

  async token(clientId, redirectUri, code, verifier, dpop) {
    return this.metadata().then(metadata => {
      const params = {
        client_id: clientId,
        grant_type: 'authorization_code',
        code: code,
        code_verifier: verifier,
        redirect_uri: redirectUri
      };
      return dpop.generateToken(metadata.token_endpoint, 'POST')
        .then(dpopToken => fetch(metadata.token_endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'DPoP': dpopToken },
          body: Object.keys(params).map(k => k + '=' + params[k]).join('&')}))
        .then(res => res.json());
    });
  }
}
