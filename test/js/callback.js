import { CONFIG } from './config.js';
import { OpenId, PKCE } from './authentication.js';

((config) => {
  document.getElementById('issuer').focus();
  document.getElementById('solid-oidc').addEventListener('submit', (evt) => {
    evt.preventDefault();

    const data = {
      issuer: document.getElementById('issuer').value,
      verifier: PKCE.createVerifier() };

    window.opener.postMessage(data, window);

    const openid = new OpenId(data.issuer);
    PKCE.createChallenge(data.verifier)
      .then(challenge => openid.authorize(config.clientId, config.redirectUri, config.pkceMethod, challenge))
      .then(location => window.location.href = location);
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get('error')) {

    const data = {
      error: params.get('error'),
      error_description: params.get('error_description') };

    window.opener.postMessage(data, window);
    window.close();

  } else if (params.get('code')) {
    const data = {
      code: params.get('code'),
      state: params.get('state') };

    window.opener.postMessage(data, window);
    window.close();
  }
})(CONFIG);
