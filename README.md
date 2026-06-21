# Datacenter Tycoon

A playable browser prototype for a data center tycoon game. The demo includes:

- Regional map parcel selection and data center placement
- CPU design sliders for clock speed, cache, cores, AI acceleration, and ECC
- Staff hiring for chip research, operations, community, and sales
- Contract selection with capacity requirements and monthly revenue
- Loans, repayment, payroll, operating costs, and monthly simulation
- Power draw and community goodwill pressure that can trigger fines or shutdown risk

## Run

Start the included Node server:

```powershell
npm.cmd start
```

Then open `http://localhost:5173`.

If port `5173` is already in use, pick another port:

```powershell
$env:PORT=5174; npm.cmd start
```
