# Alumni Network - Local Network Access Guide

## Quick Start

To run the website so all computers on your college network can access it:

### Step 1: Start the Backend Server

```bash
cd server
npm run dev
```

The server will display your network IP addresses like this:
```
===========================================
  Alumni Association Server Started
===========================================
  Local:    http://localhost:5000

  Network Access URLs:
    ➜  http://192.168.1.100:5000

  Share these URLs with other computers
  on your college network!
===========================================
```

### Step 2: Start the Frontend (in a new terminal)

```bash
cd client
npm run dev
```

Vite will display network URLs:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/
```

### Step 3: Share the Network URL

**Tell other students to open their browsers and go to:**
```
http://YOUR_IP_ADDRESS:5173
```

(Replace `YOUR_IP_ADDRESS` with the IP shown in your terminal)

---

## Important Notes

### Windows Firewall
If others can't connect, you may need to allow the app through Windows Firewall:

1. Open **Windows Security**
2. Go to **Firewall & network protection**
3. Click **Allow an app through firewall**
4. Click **Change settings** → **Allow another app**
5. Add `node.exe` from your Node.js installation folder
6. Make sure both **Private** and **Public** checkboxes are ticked

### Finding Your IP Address
If you need to find your IP address manually:

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your network adapter (usually starts with 192.168.x.x or 10.x.x.x)

**Mac/Linux:**
```bash
ifconfig
# or
ip addr
```

### Troubleshooting

1. **"Connection refused" error:**
   - Make sure both server and client are running
   - Check if Windows Firewall is blocking the connection
   - Verify you're using the correct IP address

2. **"CORS error" in browser:**
   - Make sure you're accessing via the network IP, not localhost
   - Restart both server and client

3. **Slow loading:**
   - The first load may take longer as assets are compiled
   - Subsequent loads should be faster

### Network Requirements
- All computers must be on the same local network (e.g., college WiFi)
- Ports 5000 (backend) and 5173 (frontend) must not be blocked

---

## Mobile Access

You can also access the website from phones connected to the same WiFi network. Just open the browser on your phone and go to:

```
http://YOUR_COMPUTER_IP:5173
```

The website is fully responsive and works great on mobile devices!

---

## Production Deployment

For a permanent deployment (not just local network):

1. Build the frontend: `cd client && npm run build`
2. Set up a proper web server (Nginx, Apache)
3. Use a reverse proxy for the backend
4. Consider using a domain name and SSL certificate

For local network testing, the development setup above is sufficient.
