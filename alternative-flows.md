# Support for alternative authentication flows under Solid-OIDC
In this proposal we will be documenting how alternative flows to the OpenID Connect 1.0 Authorization Code Grant could be used for 
authenticating a Solid application.

## Problem Statement
The Solid-OIDC specification currently allows for the use of the Authorization Code Grant flow to obtain a DPOP-bound Identity Token.
However many flows may exist where an application needs to retrieve a resource governed by the Solid-OIDC specification that do
not allow for the use of a classical, browser-based OIDC Authorization Code grant flow. OAuth 2.0 allows for a number of these advanced
flows under its specification, however these wouldn't yield us with the required identity token for Solid-OIDC conformance.

##  Use Cases
The following section aims to:
- Give an overview of use cases that fall outside of the realm of Authorization Code Grant as defined by Solid-OIDC
- Define these cases in terms of the number of Client IDs and WebIDs that are used

### Service Accounts
In the context of server-to-server interactions, an application may not need to access resources on behalf of some user but rather assume
their own identity. For such scenario's you could use a service account, which is an account that belongs to the application instead of to
an individual end user. 

In the context of Solid this would imply that the application's Client ID Document also conforms to the WebID specification and lists an IdP
via the `solid:oidcIssuer` attribute. The application obtains an identity token with this IdP through some oAuth or OIDC flow, that asserts
this WebID through the `webid` claim.

#### Example:
- Suppose you are using a calendar synchronization service to synchronize your calendar availabilities with your Solid Pod. 
You have authorized this service to access your calendar with different existing services, for example through oAuth. 
Also, an authorization to your calendar resources has been given to this synchronization service's WebID. 
Now the calendar synchronization service should be able to authenticate in order to access these resources.

### Multi-tenant Backend Services
In the context of multi-tenant backend services a single server side application is used by multiple entities, each having their own WebID.
The server side application should be able to assume the identity of each of these entities, and present the necessary credentials to the
authorization service asserting their WebID.

#### Example:
- Suppose an application is provided by a company's IT team to deliver invoices to Solid Pods. 
The different business units of the organisation have their own WebID and are authorized out-of-band to deliver an invoice to their customer. 
The central invoicing service then should be able to assume the identity of each of these business units in order to use their pre-existing authorizations.

### (Shared) Input-Constrained devices
Some applications may be tied to input-constrained devices where a typical redirection flow cannot be performed. Also, these devices may or
may not be shared by multiple end-users. While sometimes a service account may be most appropriate in this context, other times it might be 
necessary for these devices to assume your identity.

#### Example:
- Suppose a smart picture frame wants to access your own photos as well as pictures that your friends have shared with you. Therefore it will
need to assume your WebID in its interactions with these resources shared by third parties. The oAuth 2.0 framework provides the Device Code
flow for this exact purpose, however this flow would not yield the identity token needed to integrate with the Solid-OIDC flow.

## Proposed solutions
The following section proposes a number of alternative solutions that could be used to integrate these flows within the existing Solid-OIDC specification.

### 1. OAuth 2.0 Token Exchange
The [OAuth 2.0 Token Exchange specification](https://datatracker.ietf.org/doc/html/rfc8693) defines a mechanism for applying the concept of
a Security Token Service to OAuth 2.0. A Security Token Service (STS) is a service capable of validating security tokens provided to it and
issuing new security tokens in response, which enables clients to obtain appropriate access credentials for resources in heterogeneous
environments or across security domains. The mechanics of this might be applicable if we want to allow clients to exchange an OAuth 2.0
Access Token for a Solid-OIDC Identity Token.

#### Proposed use
Suppose a client application has already obtained an OAuth 2.0 access token through one of its supported flows, like Device Code Grant or
Client Credentials Grant, and needs to exchange this for a OIDC ID token. If the oAuth AS supports our proposed token exchange flow to
obtain an identity token based on a previous access token a request flow similar to what is shown below could be envisioned by the Solid
authentication specification:

1. Preconditions:
    - An OAuth Access token has been obtained by the client
    - The Token Exchange endpoint is able to determine for some Access Token which WebID it can yield in the ID Token
    - The WebIDs for which the Token Exchange can yield ID Tokens, have this Token Exchange provider's ID Token Issuer listed as a trusted `solid:oidcIssuer`.
    - The Token Exchange's ID Token Issuer should provide a valid OIDC discovery configuration at `/.well-known/openid-configuration`.
2. Token exchange request is made by the client:
    - The `grant_type` **must** be `urn:ietf:params:oauth:grant-type:token-exchange`.
    - The audience `solid` **must** be specified in the request.
    - The `subject_token` **must** contain the Access Token that was obtained by the client through the prior OAuth 2.0 flow.
    - In order to yield a DPoP-bound ID Token, the client **must** provide a DPoP through the `DPOP`-header.
    - The client **should** specify the `requested_token_type` as being `urn:ietf:params:oauth:token-type:id_token`.

```
    POST /as/token.oauth2 HTTP/1.1
    Host: as.example.com
    Content-Type: application/x-www-form-urlencoded
    DPOP: eyJhbGciOiJFUzI1NiIsInR5cCI6Im...VNaFNEaV80In19
    

    grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Atoken-exchange
    &audience=solid
    &subject_token=eyJhbGciOiJFUz...FVBDaQpKjn5JzAw
    &subject_token_type=urn%3Aietf%3Aparams%3Aoauth%3Atoken-type%3Aaccess_token
    &requested_token_type=urn%3Aietf%3Aparams%3Aoauth%3Atoken-type%3Aid_token
```
3. In response a valid Solid-OIDC ID token is returned by the token exchange.

```
    HTTP/1.1 200 OK
    Content-Type: application/json
    Cache-Control: no-cache, no-store

    {
     "access_token":"eyJhbGciOiJFUzI1NiIsImtpZCI6IjcyIn0.eyJhdWQiOiJ1cm4
       6ZXhhbXBsZTpjb29wZXJhdGlvbi1jb250ZXh0IiwiaXNzIjoiaHR0cHM6Ly9hcy5l
       eGFtcGxlLmNvbSIsImV4cCI6MTQ0MTkxMzYxMCwic3ViIjoiYmRjQGV4YW1wbGUub
       mV0Iiwic2NvcGUiOiJvcmRlcnMgcHJvZmlsZSBoaXN0b3J5In0.rMdWpSGNACTvnF
       uOL74sYZ6MVuld2Z2WkGLmQeR9ztj6w2OXraQlkJmGjyiCq24kcB7AI2VqVxl3wSW
       nVKh85A",
     "issued_token_type":
       "urn:ietf:params:oauth:token-type:id_token",
     "token_type":"Bearer",
     "expires_in":3600
    }
```

4. The OIDC ID token can be used with the Authorization Service conforming to the Solid-OIDC specification.


#### Concerns, remarks and questions
- This method does assume the OAuth AS providing this token exchange endpoint can also issue OpenID Connect identity tokens and has the
necessary discovery URI. This OP should then be listed in the `solid:oidcIssuer` of the WebID that is assumed through the token exchange. **(^LD)**
- This method currently does not yet consider how a client can choose between multiple WebIDs during the token exchange, if a single access
token were allowed to yield ID tokens for multiple identities. Furthermore there doesn't seem to be a convenient parameter in the Token
Exchange RFC where we could add this (except for the actor_token maybe, but this seems more fitting for delegation than impersonation). But,
perhaps we should consider it as out-of-scope here. **(^LD)**
- OAuth Token Exchange allows for both delegation and impersonation, delegation might bring us closer to the scope of authorization than
authentication so currently we have only assumed that access tokens allow (through some out of band configuration) impersonation of some
WebID. **(^LD)**
- We should more clearly sketch out the relation between Token Exchange endpoint, OAuth AS and OP perhaps through some sequence diagrams.
There seems to be some degree of choice here, to me it would make sense to define taht the token exchange endpoint is to be provided by the
OIDC IdP of the WebID being impersonated such that it can decide which access tokens are trusted for obtaining an ID token. However one
could also think of it as a part of the OAuth AS where the client originally obtained the OAuth access token, but this would be more
limiting as to which identities can be assumed. **(^LD)**
- Token exchange could also resolve [this note](https://solid.github.io/solid-oidc/#privacy-token-reuse) in the current specification, as
the exchanged ID token can be stripped of extraneous claims. **(^LD)**

### 2. Extension of the Authorization Service's `uma_profiles_supported`
If we determine the extension point of the Solid-OIDC specification to be the Authorization Service, we could add to the supported UMA
profiles the specification of a [JWT Access token for OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc9068). Specific requirements for
the access token, like the `webid` claims and `solid` audience, could be imposed here by the specification.

#### Concerns, remarks and questions
- It may be conflicting with the goal of the specification (authentication) to imply the use of an access token (which is primarily used from an authorization perspective). **(^LD)**
- The use of a separate token type would allow for the Authorization Service to distinguish between OIDC and OAuth 2.0 discovery URIs in a cleaner way. **(^LD)**