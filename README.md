# Solid-OIDC Specification

[![Join the chat at https://gitter.im/solid/authentication-panel](https://badges.gitter.im/solid/authentication-panel.svg)](https://gitter.im/solid/authentication-panel?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

This repository hosts the Editor's draft of the Solid-OIDC specification.

This specification has been incubated by the
[Solid Authentication Panel](https://github.com/solid/authentication-panel) for inclusion in the
[Solid Technical Reports](https://solidproject.org/TR/).

Anyone is welcome to join the [weekly meetings](https://github.com/solid/authentication-panel#meetings).

The Solid Authentication Panel meetings and associated communication channels are open to all
to participate. It is expected that everyone will abide by the
[Solid Code of Conduct](https://github.com/solid/process/blob/main/code-of-conduct.md)
in all of these interactions.

## Editor's Drafts

* [Specification](https://solid.github.io/solid-oidc/)
* [Primer](https://solid.github.io/solid-oidc/primer/)

## Releasing a new Solid-OIDC Draft Report

Creating a new Solid-OIDC draft report for submission to the Solid Specification is simple.
One must only create a new tag in the repository:

    $ git tag -s solid-oidc-draft-04 -m "Solid-OIDC Community Group Draft Report 04"
    $ git push origin solid-oidc-draft-04

Now the GitHub automation will run and produce a formatted version of the Solid-OIDC
specification in the `solid-tr-publication` branch. Pull this branch to your local
environment and copy the files present into the `solid/specification` repository,
submitting a pull request with these changes.

## Releasing a new Solid-OIDC Final Report

The process of creating a Community Group final report is exactly the same as with
creating a draft report, only the tag is slightly different:

    $ git tag -s solid-oidc-final-02 -m "Solid-OIDC Community Group Final Report 02"
    $ git push origin solid-oidc-final-02

The same process applies to adding this to the `solid/specification` repository.
