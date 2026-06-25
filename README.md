# CurrencyLens — AI Currency & Amount Recognition

An AI-powered web app that scans images of banknotes and coins, identifies the currency (Ghanaian Cedi, US Dollar, Kuwaiti Dinar, Euro, and 180+ others), and reads the exact denomination — powered by Claude Vision.

---

## Features

- **Instant currency detection** — upload or snap a photo
- **180+ world currencies** — GHS, USD, KWD, EUR, GBP, NGN, JPY, CNY, INR, AUD, and more
- **Full details** — currency name, ISO code, symbol, country, denomination, note/coin type, condition
- **Multi-currency support** — detects multiple currencies in one image
- **AI confidence scoring** — high / medium / low per detection
- **Camera support** — use your phone camera directly
- **Drag & drop** — drag images straight into the browser

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure your API key

```bash
cp .env.example .env
```

Open `.env` and replace `your_api_key_here` with your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Get your key at: https://console.anthropic.com

### 3. Run the server

```bash
npm start
```

Open your browser at **http://localhost:3000**

For development with auto-reload:

```bash
npm run dev
```

---

## Project Structure

```
currency-detector/
├── server.js          # Express backend + Claude Vision API
├── package.json
├── .env.example       # Environment variable template
├── .env               # Your API key (never commit this)
├── .gitignore
├── README.md
└── public/
    ├── index.html     # Main frontend UI
    ├── style.css      # Styling
    └── app.js         # Frontend JavaScript
```

---

## Deployment

### Deploy to Render (Free)

1. Push this folder to a GitHub repository
2. Go to https://render.com → New → Web Service
3. Connect your repo
4. Set:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
5. Add environment variable: `ANTHROPIC_API_KEY = sk-ant-...`
6. Deploy ✓

### Deploy to Railway

1. Install Railway CLI: `npm install -g @railway/cli`
2. Run: `railway init` then `railway up`
3. Set env var: `railway variables set ANTHROPIC_API_KEY=sk-ant-...`

### Deploy to Heroku

```bash
heroku create your-app-name
heroku config:set ANTHROPIC_API_KEY=sk-ant-...
git push heroku main
```

### Deploy to VPS / Ubuntu Server

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and install
git clone <your-repo>
cd currency-detector
npm install

# Set env
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env

# Run with PM2 (persistent)
npm install -g pm2
pm2 start server.js --name currency-detector
pm2 save
pm2 startup
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/detect` | Analyze currency in uploaded image |
| GET | `/api/health` | Check server and API key status |

### POST `/api/detect`

**Request:** `multipart/form-data` with field `image` (JPEG, PNG, WebP, GIF — max 10MB)

**Response:**
```json
{
  "success": true,
  "result": {
    "detected": true,
    "currencies": [
      {
        "currency_name": "Ghanaian Cedi",
        "currency_code": "GHS",
        "symbol": "₵",
        "country": "Ghana",
        "denomination": "50",
        "amount": 50,
        "note_or_coin": "note",
        "condition": "good",
        "confidence": "high"
      }
    ],
    "total_by_currency": [
      { "currency_code": "GHS", "currency_name": "Ghanaian Cedi", "symbol": "₵", "total": 50 }
    ],
    "multiple_currencies": false,
    "image_quality": "clear",
    "notes": "Crisp 50 Cedi note, clearly visible serial number"
  }
}
```

---

## Tips for Best Results

- Use **good lighting** — avoid shadows across the note
- Keep the **full note in frame** — don't crop edges
- For coins, a **flat overhead shot** works best
- Supported formats: **JPEG, PNG, WebP, GIF**
- Max file size: **10 MB**

---

## License

MIT — free to use and modify.
