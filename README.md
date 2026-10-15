# Xx2Dee7xX-joke-cli

Small CLI that fetches random jokes from JokeAPI.

## Requirements

- Node.js 18+ (uses global fetch and AbortController)

## Install / Run

Make the script executable and run locally:

```bash
chmod +x index.js
./index.js
```

Or run with node directly:

```bash
node index.js --category Programming --repeat 3
```

## Options

- `--category, -c`  Joke category (Any, Programming, Misc, Dark, Pun, Spooky, Christmas, etc.)
- `--unsafe`        Allow all flags (disables blacklist). By default explicit/racist/etc. are filtered.
- `--timeout`       Fetch timeout in milliseconds (default 5000)
- `--retries`       Number of retries on network errors (default 2)
- `--repeat`        How many jokes to fetch (default 1)

## Notes

- The CLI uses [JokeAPI](https://v2.jokeapi.dev). No API key is required.
- For Node <18 support, add a polyfill such as `node-fetch` and update the script accordingly.
