with import <nixpkgs> { };
mkShell {
  packages = [
    just
    nodejs_24
  ];
}
