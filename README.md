# DumbTerm

A stupidly simple web-based terminal emulator, with common tools and Starship enabled! 🚀

![dumbterm-preview](https://github.com/user-attachments/assets/d7847f80-a8fc-428c-9515-2c299ebd8f67)

## Table of Contents
- [Features](#features)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Option 1: Docker](#option-1-docker-for-dummies)
  - [Option 2: Docker Compose](#option-2-docker-compose-for-dummies-who-like-customizing)
  - [Option 3: Running Locally](#option-3-running-locally-for-developers)
- [Configuration](#configuration)
- [Security](#security)
- [Technical Details](#technical-details)
- [Links](#links)
- [Contributing](#contributing)
- [Future Features](#future-features)

## Features

- 🖥️ Web-based terminal access from anywhere
- 🌙 Dark mode support
- 📱 Responsive design for mobile and desktop
- 🐳 Docker support (Debian-based container)
- 🔧 Pre-installed utilities: starship, nerdfonts, wget, curl, ssh, git, vim, nano, htop, unzip and more.
- 🔒 Optional PIN protection (numeric)
- ✨ Starship prompt integration for beautiful terminal experience
- 🔍 Terminal search functionality (`ctrl+f` or `cmd+f`)
- 📂 Custom volume mappings
- 🔗 In-terminal hyperlinks
- ⌨️ Keyboard shortcuts for common actions (hover tooltips)
- 📱 PWA Support for mobile and desktop
- ⚡ XTerm.js for fast terminal rendering

## Supported XTerm Addons

DumbTerm includes the following XTerm.js addons to enhance your terminal experience:

| Addon | Version | Description |
|-------|---------|-------------|
| **@xterm/addon-attach** | ^0.11.0 | Easily attach a terminal to a WebSocket |
| **@xterm/addon-canvas** | ^0.7.0 | Renderer that uses canvas to draw terminal content |
| **@xterm/addon-clipboard** | ^0.1.0 | Clipboard integration for copy/paste support |
| **@xterm/addon-fit** | ^0.10.0 | Automatically resize terminal to fit its container |
| **@xterm/addon-image** | ^0.8.0 | Display images inline in the terminal |
| **@xterm/addon-ligatures** | ^0.8.0 | Font ligatures support |
| **@xterm/addon-search** | ^0.15.0 | Search text in the terminal buffer |
| **@xterm/addon-serialize** | ^0.13.0 | Serialize terminal output to string or HTML |
| **@xterm/addon-unicode11** | ^0.8.0 | Additional Unicode 11 character width support |
| **@xterm/addon-web-links** | ^0.11.0 | Automatically hyperlink URLs in terminal |
| **@xterm/addon-webgl** | ^0.18.0 | Renderer that uses WebGL for better performance |

## Quick Start

### Prerequisites

* Docker (recommended)
* Node.js >=20.0.0 (for local development)

### Option 1: Docker (For Dummies) - Recommended

* Docker method uses a Debian Bullseye-based container with a pre-installed terminal environment.

```bash
# Pull and run with one command
docker run -p 3000:3000 \
  -v ./data:/root/data \
  -v ./config:/root/.config \ 
  -e DUMBTERM_PIN=1234 \
  -e SITE_TITLE=DumbTerm \
  -e BASE_URL=http://localhost:3000 \
  -e ALLOWED_ORIGINS=http://localhost:3000 \
  -e ENABLE_STARSHIP=true \
  -e TZ=America/Los_Angeles \
  -e LOCKOUT_TIME=15 \
  dumbwareio/dumbterm:latest
```

1. Go to http://localhost:3000
2. Enter your PIN if configured
3. Enjoy your web-based terminal!

### Option 2: Docker Compose (For Dummies who like customizing)

Create a `docker-compose.yml` file or use the provided one:

```yaml
services:
  dumbterm:
    image: dumbwareio/dumbterm:latest
    container_name: dumbterm
    restart: unless-stopped
    ports:
      - ${DUMBTERM_PORT:-3000}:3000
    volumes:
      - ${DUMBTERM_CONFIG:-./config}:/root/.config
      - ${DUMBTERM_DATA_DIR:-./data}:/root/data
    environment:
      # Container timezone
      TZ: ${DUMBTERM_TZ:-America/Los_Angeles}
      # The title shown in the web interface
      SITE_TITLE: ${DUMBTERM_SITE_TITLE:-DumbTerm}
      # Recommended PIN protection (leave empty to disable)
      DUMBTERM_PIN: ${DUMBTERM_PIN:-1234}
      # The base URL for the application
      BASE_URL: ${DUMBTERM_BASE_URL:-http://localhost:3000}
      ENABLE_STARSHIP: ${ENABLE_STARSHIP:-true}
      LOCKOUT_TIME: ${DUMBTERM_LOCKOUT_TIME:-15} # Minutes
      # (OPTIONAL) - List of allowed origins for CORS
      # ALLOWED_ORIGINS: ${DUMBTERM_ALLOWED_ORIGINS:-http://localhost:3000}
```

Then run:
```bash
docker compose up -d
```

### Option 3: Running Locally (For Developers)

* Local method will use your local terminal environment (Windows: Powershell, Mac / Linux: bash).

1. Install dependencies:
```bash
npm install
```

2. `cp .env.example .env` > Set environment variables in `.env`:
```bash
PORT=3000                  # Port to run the server on
DUMBTERM_PIN=1234          # Optional PIN protection
SITE_TITLE=DumbTerm        # Custom site title
BASE_URL=http://localhost:3000  # Base URL for the application
```

3. Start the server:
```bash
npm start
```

## Configuration

### Environment Variables

| Variable            | Description                                                 | Default                | Required |
|---------------------|-------------------------------------------------------------|------------------------|----------|
| PORT                | Server port                                                 | 3000                   | No       |
| BASE_URL            | Base URL for the application                                | http://localhost:PORT  | Yes      |
| DUMBTERM_PIN        | PIN protection (numeric)                                    | None                   | No       |
| SITE_TITLE          | Site title displayed in header                              | DumbTerm               | No       |
| TZ                  | Container timezone                                          | America/Los_Angeles    | No       |
| ENABLE_STARSHIP     | Enable Starship prompt (docker only)                        | true                   | No       |
| NODE_ENV            | Node environment mode (development or production)           | production             | No       |
| ALLOWED_ORIGINS     | Allowed CORS origins (comma-separated list)                 | * (all origins)        | No       |
| DEBUG               | Enable debug logging                                        | FALSE                  | No       |
| LOCKOUT_TIME        | Custom Pin Lockout Time (in minutes)                        | 15                     | No       |

## Starship usage
* Starship is a cross-shell prompt that provides a beautiful terminal experience.
* It is enabled by default in the Docker image and is the recommended method.
* To disable it, set `ENABLE_STARSHIP` to `false` in your environment variables.
* You can customize the Starship prompt by using one of the following steps:

### 1. Use a preset configuration from starship.

#### Starship Presets:
> copy and paste one of the starship preset commands below into DumbTerm and that's it!
<details>
<summary>Example:</summary>

![preset-preview](https://github.com/user-attachments/assets/affdd780-5471-40de-adfd-9242feeec9da)
</details>
<br/>

<details>
<summary>View All Starship Presets:</summary>

| Preset Name | Command | Preview |
|-------------|---------|---------|
| Nerd Font Symbols | `starship preset nerd-font-symbols -o ~/.config/starship.toml` | ![Nerd Font Symbols](https://starship.rs/presets/img/nerd-font-symbols.png) |
| Bracketed Segments | `starship preset bracketed-segments -o ~/.config/starship.toml` | ![Bracketed Segments](https://starship.rs/presets/img/bracketed-segments.png) |
| Plain Text Symbols | `starship preset plain-text-symbols -o ~/.config/starship.toml` | ![Plain Text Symbols](https://starship.rs/presets/img/plain-text-symbols.png) |
| No Runtime Versions | `starship preset no-runtime-versions -o ~/.config/starship.toml` | ![No Runtime Versions](https://starship.rs/presets/img/no-runtime-versions.png) |
| No Empty Icons | `starship preset no-empty-icons -o ~/.config/starship.toml` | ![No Empty Icons](https://starship.rs/presets/img/no-empty-icons.png) |
| Pure Prompt | `starship preset pure-preset -o ~/.config/starship.toml` | ![Pure Prompt](https://starship.rs/presets/img/pure-preset.png) |
| Pastel Powerline | `starship preset pastel-powerline -o ~/.config/starship.toml` | ![Pastel Powerline](https://starship.rs/presets/img/pastel-powerline.png) |
| Tokyo Night `(DumbTerm Default)` | `starship preset tokyo-night -o ~/.config/starship.toml` | ![Tokyo Night](https://starship.rs/presets/img/tokyo-night.png) |
| Gruvbox Rainbow | `starship preset gruvbox-rainbow -o ~/.config/starship.toml` | ![Gruvbox Rainbow](https://starship.rs/presets/img/gruvbox-rainbow.png) |
| Jetpack | `starship preset jetpack -o ~/.config/starship.toml` | ![Jetpack](https://starship.rs/presets/img/jetpack.png) |
| No Nerd Fonts | `starship preset no-nerd-font -o ~/.config/starship.toml` | N/A |
</details>

- You can also view the available presets by running `starship preset -l` in DumbTerm.

For more details, visit the [Starship Presets page](https://starship.rs/presets/).

### 2. Modify the `~/.config/starship.toml` file in your set volume mount or within the container.  
  - The default configuration is located in `/root/.config/starship.toml`.
  - You can also mount a custom `starship.toml` file to the container using Docker volumes.
  - Update or add your custom configurations to starship.toml.
    - Visit [Starship Configuration](https://starship.rs/config/) for more information on customizing the prompt.

### 3. Running locally
- If you are running DumbTerm locally, DumbTerm will inherit your current styles.
  - Meaning if you already have starship enabled locally, you should be able to see your current styles accordingly.
- You must install Starship on your local machine if you wish to use DumbTerm with starship _locally_.
  - To install Starship, follow the instructions on the [Starship installation page](https://starship.rs/installing/).

## Security

>  It is highly recommended to set a strong PIN, use HTTPS, use ALLOWED_ORIGINS, and integrate with an auth provider (i.e. Authentik / Authelia / tinyauth, etc).

We're dumb, but not stupid. Use a full-featured auth provider for production use.

* https://github.com/goauthentik/authentik
* https://github.com/authelia/authelia
* https://github.com/steveiliop56/tinyauth (Potentially will integrate with DumbTerm)

### Features

* Variable-length PIN support (numeric)
* Constant-time PIN comparison
* Brute force protection:
  * 5 attempts maximum
  * 15-minute lockout after failed attempts
  * IP-based tracking
* Secure cookie handling
* Session-based authentication
* CORS support for origin restrictions (optional)
* HTTPS support (when configured with proper BASE_URL)

## Technical Details

### Stack

* **Backend**: Node.js (>=20.0.0) with Express
* **Frontend**: XTerm.js for terminal emulation
* **Container**: Docker with Debian Bullseye base
* **Terminal**: node-pty for process spawning
* **Communication**: WebSockets for real-time terminal I/O
* **Security**: cors for cross-origin requests
<!-- * **Security**: Helmet for HTTP security headers -->

### Dependencies

* express: Web framework
* node-pty: Terminal process spawning
* xterm: Terminal frontend
* ws: WebSocket server
* cookie-parser: Cookie handling
* express-session: Session management
* cors: security for cross-origin requests
<!-- * helmet: Security middleware -->

## Usage

- Access your terminal from any device with a web browser
- Execute commands just like in a native terminal
- PIN protection (recommended) prevents unauthorized access
- Starship prompt provides a beautiful terminal experience with git status, command duration, etc.
- Use the data directory to persist files between container restarts
- Pre-installed utilities include: starship, nerdfonts, apt-utils, curl, wget, ssh, git, vim, nano, htop, net-tools, iputils-ping, fontconfig, unzip, locales.

## Links

- GitHub: [github.com/dumbwareio/dumbterm](https://github.com/dumbwareio/dumbterm)
- Docker Hub: [hub.docker.com/r/dumbwareio/dumbterm](https://hub.docker.com/r/dumbwareio/dumbterm)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using conventional commits
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See Development Guide for local setup and guidelines.

---

Made with ❤️ by DumbWare.io & [gitmotion](https://github.com/gitmotion)

## 🌐 Check Us Out
- **Website:** [dumbware.io](https://www.dumbware.io/)
- **Buy Us a Coffee:** [buymeacoffee.com/dumbware](https://buymeacoffee.com/dumbware) ☕
- **Join the Chaos:** [Discord](https://discord.gg/zJutzxWyq2) 💬

## Future Features

* tinyauth integration
* Persistent terminal history

> Got an idea? Open an issue or submit a PR
