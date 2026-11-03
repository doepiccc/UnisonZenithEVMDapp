# UNISON — Zenith settlement desk

**UNISON** — статический React DApp для платежей из EVM-кошелька в Canton через официальный Zenith Gateway. Получатель создаёт ссылку или QR с полным Canton party ID, а плательщик открывает её, проверяет реквизиты и подписывает перевод в обычном EVM-кошельке.

![Unison logo](public/unison-logo.svg)

## Почему этот продукт подходит Zenith

- **Нативная связка EVM → Canton:** адрес inbox вычисляется чтением `inboxOf(string)` у Zenith Gateway.
- **Детерминированная финальность:** после transaction receipt дополнительные подтверждения не нужны.
- **Полная EVM-совместимость:** подключение, переключение сети, balances и переводы работают через стандартные EIP-1193/JSON-RPC API.
- **Gateway assets:** ZTH, DORIG, DUSD и wCC; для Canton-origin активов UI требует подтверждения standing acceptance.
- **Без backend:** payment request кодируется в URL fragment, а история хранится только в `localStorage`.

## Реализовано

- live-проверка Zenith RPC, chain ID, Gateway bytecode, gas и последнего блока;
- автоматическое добавление, переключение и проверка Zenith EVM Testnet в EIP-1193-совместимом кошельке;
- отдельное подключение Canton-кошелька через официальный CIP-103 DApp SDK;
- проверка Zenith Canton synchronizer и настройка собственного Canton participant;
- создание participant-backed Canton wallet (Party ID + Ledger API user + inbox) и подключение собственного CIP-103 Wallet Gateway;
- безопасная валидация полного Canton party ID;
- отдельный экран **Canton setup** с двумя путями онбординга: CIP-103 wallet или собственный participant;
- проверка Canton 3.6.1, Zenith synchronizer и package vetting;
- SHA-256 проверка и загрузка официальных Zenith DAR-файлов из UI;
- создание Party ID, Ledger API user и прав `actAs` / `readAs`;
- сохранение получателя, вычисленного inbox и one-click standing acceptance для DUSD / wCC;
- вычисление детерминированного inbox и проверка, развёрнут ли он;
- перевод native ZTH или зарегистрированного ERC-20;
- request links и QR-коды, совместимые с GitHub Pages;
- экран прогресса EVM → Canton и ссылка на settlement proof в explorer;
- локальные Requests и Activity;
- оригинальный responsive UI и логотип (`public/unison-logo.svg`).

## Запуск

```bash
npm install
npm run dev
```

Dev-сервер всегда запускается на `http://127.0.0.1:5173` (`strictPort: true`).

Проверки:

```bash
npm run lint
npm test
npm run build
```

## Создание Canton recipient

Zenith использует отдельную Canton test network, а не Global Synchronizer TestNet. Party ID нельзя безопасно «сгенерировать» только из браузера или через публичный EVM RPC: party должен быть размещён на participant, подключённом к Zenith synchronizer.

Экран **Canton** предлагает два реальных варианта:

1. **Create Canton wallet / Own participant** — подключить JSON Ledger API, проверить версию и synchronizer, загрузить два DAR из официального Zenith bundle, затем одной формой создать party, Ledger API user и права. Inbox вычисляется автоматически.
2. **Connect existing (CIP-103)** — найти установленный wallet или указать dApp URL собственного Wallet Gateway, проверить synchronizer, выбрать allocated party и сохранить его как recipient. Ключи остаются в wallet/participant.

Generic Suggested Wallets отключены: официальный DApp SDK 1.8 публикует там только Send Connect, у которого нет проверенного профиля отдельного Zenith synchronizer. Для remote-подключения можно запустить официальный `@canton-network/wallet-gateway-remote` против своего Zenith participant.

Для operator-варианта нужны:

- Canton `3.6.1` с persistent storage;
- подключение к `https://synchronizer.testnet.zenith.network:443`;
- `zenith-gateway-parties-0.1.0.dar` и `zenith-dev-cc-0.1.1.dar`, полученные у `partners@zenith.network`.

DAR-файлы не входят в репозиторий: UI проверяет их опубликованные SHA-256 до отправки на participant. Bearer token хранится только в React state и не записывается в `localStorage`.

В dev-режиме `/api/canton` проксируется на `http://127.0.0.1:7575`, `/api/canton-wallet` — на `http://127.0.0.1:3030/api/v0/dapp`, а Gateway registry — через `/api/zenith-gateway`. Для статического production deployment настройте HTTPS reverse proxy к JSON Ledger API или используйте CIP-103 wallet; браузерный CORS нельзя обходить передачей admin token стороннему proxy.

## GitHub Pages

Vite собирает все ресурсы с относительным `base: './'`, навигация использует hash routes, а `manifest.webmanifest` также содержит относительные пути. Поэтому одна и та же сборка работает как в корне, так и в любой подпапке GitHub Pages без знания имени родительского репозитория.

### Отдельный репозиторий

1. Отправьте проект в ветку `main`.
2. В **Settings → Pages → Build and deployment** выберите **GitHub Actions**.
3. Workflow `.github/workflows/deploy.yml` проверит и опубликует `dist/`.

### Submodule внутри другого Pages-репозитория

Workflow, находящийся внутри submodule, GitHub не запускает. Родительский репозиторий должен получить submodule, собрать его и добавить результат в общий Pages artifact. Для этого в корне проекта находится composite action `action.yml`.

Добавьте submodule, например в `apps/unison`:

```bash
git submodule add https://github.com/OWNER/ZenithEVMDapp.git apps/unison
git commit -m "Add Unison app"
```

В Pages-workflow родительского репозитория добавьте следующие шаги. Здесь предполагается, что сборка основного сайта уже находится в `site-dist`:

```yaml
- name: Checkout with submodules
  uses: actions/checkout@v4
  with:
    submodules: recursive

# Сначала соберите основной сайт в site-dist.

- name: Add Unison to the Pages artifact
  uses: ./apps/unison
  with:
    output-directory: site-dist/unison

- name: Configure Pages
  uses: actions/configure-pages@v5

- name: Upload Pages artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: site-dist

- name: Deploy Pages
  id: deployment
  uses: actions/deploy-pages@v4
```

Приложение будет доступно по адресу `https://user.github.io/parent-repository/unison/#/overview` (или `https://user.github.io/unison/#/overview` для репозитория `user.github.io`). Платёжные ссылки `#/pay/...` продолжат открываться напрямую и не требуют SPA rewrite.

Для ручной интеграции вместо composite action достаточно выполнить `npm ci` и `npm run build:pages` в submodule, а затем скопировать всё содержимое `dist/`, включая `.nojekyll`, в подпапку итогового Pages artifact. Публиковать исходную папку submodule напрямую нельзя: GitHub Pages не компилирует TypeScript/Vite-приложение.

## Сеть

| Параметр | Значение |
| --- | --- |
| Chain | Zenith EVM Testnet |
| Chain ID | `936485` (`0xe4a25`) |
| RPC | `https://rpc.testnet.zenith.network/` |
| Gateway | `0x00000000000000000000000000000000000a7e00` |
| Explorer | `https://explorer.testnet.zenith.network/` |

В EVM-кошелёк добавляется только **Zenith EVM Testnet**. Canton test network — слой финализации Zenith и не является отдельной EVM-сетью: у него нет EVM chain ID или JSON-RPC, которые можно добавить в MetaMask. Canton-идентичность подключается отдельно на странице **Canton** через CIP-103-кошелёк либо JSON Ledger API собственного participant. После получения EVM receipt транзакция уже финализирована через Canton.

Gateway REST API сейчас не отдаёт browser CORS headers. Dev-сервер использует локальный Vite proxy, а статическая сборка — проверенный snapshot текущего registry deployment; EVM-состояние читается напрямую через публичный JSON-RPC. При reset тестнета адреса, package IDs и acceptance contract нужно сверить с актуальным `/v1/registries` в документации Zenith.

> Только testnet. Активы не имеют реальной стоимости. Полный Canton party ID нужно копировать без ручного ввода: перевод на inbox, вычисленный из ошибочного ID, необратим.
