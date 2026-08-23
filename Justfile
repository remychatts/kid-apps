_list:
    just --list

ci:
    npm run ci

dev app="catalog":
    npm run dev -- {{app}}

build:
    npm run build

deploy:
    npm run build && \
    (cd dist && \
     tar zcf - . | \
      ssh WEB_SERVER 'cd SERVING_PATH && rm -rf * && tar zxvf -')
