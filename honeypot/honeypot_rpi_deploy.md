# Honyepot deploy
## 1. Install dependencies

```bash
sudo apt update
sudo apt install -y \
    python3 \
    unbound \
    python3-unbound \
    python3-requests \
    python3-scapy \
    python3-flask \
    hostapd \
    dnsmasq \
    golang
```

## 2. Configure System Files

Copy the contents of the config/ directory into their corresponding system locations.

Before proceeding, make the following changes:

- Update the network interface MAC address in:

```bash
etc/systemd/network/xx-wifi-usb.link
```

- Make the setup script executable:

```bash
chmod +x /usr/local/bin/wifi-monitor-setup.sh
```

- Change the access point password in:

```bash
etc/hostapd/hostapd.conf
```

## 3. Build the WiFi Component

Compile the Go application located in honeypot/wifi:

```bash
cd honeypot/wifi
go build -o wifi
```
Move the resulting binary to:

```bash
/home/user/wifi/
```

## 4. Enable Services
 
Reload systemd and enable all required services:

```bash
sudo systemctl daemon-reload

sudo systemctl enable wifi-monitor-mode.service
sudo systemctl enable wifi.service
sudo systemctl enable honeypot-serv.service
sudo systemctl enable dnsmasq
sudo systemctl enable hostapd
```

## 5. Deploy the Honeypot

Move the honeypot/ directory to:

```bash
/home/user/
```

If you choose a different location, update all relevant paths in the systemd service files before continuing.

## 6. Reboot

Restart the device:

```bash
sudo reboot
```

After rebooting, the device should start all services automatically and be ready for operation.

# How to use honeypot?

## App Installation

Make sure you are using the latest version of Node.js.

To run the app on your phone, install the Expo Go app and scan the QR code displayed after running the following commands in the /mobile_app/IoTApp directory:

```bash
npm install
npx expo start
```

## Using the App

1. Connect to the honeypot Wi-Fi network named Honeypot-DevXXX (where XXX represents a numeric identifier)
2. Open the Scan tab and select a Wi-Fi network to scan
3. After the scan is complete, disconnect from the honeypot Wi-Fi network
4. Enable internet connectivity (mobile data)
5. To upload the scan results:
    - Tap Upload Now in the scan results screen, or
    - Navigate to Community > Upload Queue and tap Retry for the scan you want to upload to the cloud
