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
- добавление/переключение Zenith EVM Testnet в MetaMask-совместимом кошельке;
- безопасная валидация полного Canton party ID;
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

Проверки:

```bash
npm run lint
npm test
npm run build
```

## GitHub Pages

Vite настроен с `base: './'`, навигация использует hash routes, а workflow находится в `.github/workflows/deploy.yml`.

1. Создайте GitHub-репозиторий и отправьте проект в ветку `main`.
2. В **Settings → Pages → Build and deployment** выберите **GitHub Actions**.
3. Workflow соберёт и опубликует `dist/`.

Ссылки вида `https://user.github.io/repository/#/pay/...` открываются напрямую и не требуют SPA rewrite на сервере.

## Сеть

| Параметр | Значение |
| --- | --- |
| Chain | Zenith EVM Testnet |
| Chain ID | `936485` (`0xe4a25`) |
| RPC | `https://rpc.testnet.zenith.network/` |
| Gateway | `0x00000000000000000000000000000000000a7e00` |
| Explorer | `https://explorer.testnet.zenith.network/` |

Gateway REST API сейчас не отдаёт browser CORS headers, поэтому DApp не использует proxy: live-состояние читается напрямую через публичный Ethereum JSON-RPC, а список тестовых активов зафиксирован из опубликованного registry deployment. При reset тестнета адреса токенов нужно сверить с актуальным `/v1/registries` в документации Zenith.

> Только testnet. Активы не имеют реальной стоимости. Полный Canton party ID нужно копировать без ручного ввода: перевод на inbox, вычисленный из ошибочного ID, необратим.
