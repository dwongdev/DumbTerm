#!/bin/bash

# Function to install Nerd Fonts
install_nerdfonts() {
    echo "Installing JetBrainsMono Nerd Font..."
    WORKING_DIR=$(pwd)  # Save current working directory
    mkdir -p /usr/local/share/fonts/
    cd /usr/local/share/fonts/
    wget -q --show-progress --progress=bar:force:noscroll \
        "https://github.com/ryanoasis/nerd-fonts/releases/download/v3.1.1/JetBrainsMono.zip"
    unzip -o JetBrainsMono.zip -d JetBrainsMono
    rm JetBrainsMono.zip
    fc-cache -fv
    cd "$WORKING_DIR"  # Return to original working directory
}

# Function to remove Nerd Fonts and Starship
remove_customizations() {
    if [ -d "/usr/local/share/fonts/JetBrainsMono" ]; then
        echo "Removing Nerd Fonts..."
        rm -rf /usr/local/share/fonts/JetBrainsMono
        fc-cache -fv
    fi

    # Remove Starship binary if it exists
    if [ -f "/usr/local/bin/starship" ]; then
        echo "Removing Starship..."
        rm /usr/local/bin/starship
    fi
    
    # # Remove Starship config
    # if [ -f "/root/.config/starship.toml" ]; then
    #     rm /root/.config/starship.toml
    # fi
    # if [ -d "/root/.config/starship" ]; then
    #     rm -rf /root/.config/starship
    # fi
}

# Always remove any existing Starship initialization first
sed -i '/eval "$(starship init bash)"/d' /root/.bashrc

# Handle Starship and Nerd Fonts based on ENABLE_STARSHIP env var
if [ "$ENABLE_STARSHIP" = "true" ]; then
    # Install Nerd Fonts
    install_nerdfonts

    # Create config directory and copy starship config if it exists
    mkdir -p /root/.config
    if [ -f "/app/config/starship.toml" ]; then
        cp /app/config/starship.toml /root/.config/starship.toml
    fi

    # Initialize Starship in .bashrc
    echo 'eval "$(starship init bash)"' >> /root/.bashrc
    echo "Starship initialization completed!"
else
    remove_customizations
    echo "Starship and customizations have been disabled and removed"
fi

# Execute the passed command from the app directory
cd /app
exec "$@"