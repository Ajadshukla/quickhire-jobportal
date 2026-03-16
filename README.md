# JOB-PORTAL (MERN)

This is a full-stack Job Portal project using:
- MongoDB + Mongoose
- Express.js + Node.js
- React + Vite + Redux

The code already includes backend APIs and frontend UI. You only need to connect your own services and run both apps.

## Project Structure

- `Backend/` -> API server, authentication, MongoDB models/routes/controllers
- `Frontend/` -> React client app

## What You Need Before Running

1. Node.js LTS installed (includes npm)
2. MongoDB (choose local MongoDB Community Server or MongoDB Atlas)
3. Cloudinary account (required by current code for image/resume upload flows)

## 1) MongoDB Setup (Your Own Database)

You have two good options.

### Option A: Local MongoDB (on your PC)

1. Install MongoDB Community Server from official website.
2. Keep default port `27017`.
3. Ensure MongoDB service is running.
4. Use this connection format:

```env
MONGO_URI=mongodb://127.0.0.1:27017/job_portal
```

### Option B: MongoDB Atlas (cloud)

1. Create free Atlas cluster.
2. Create DB user and password.
3. Add your IP in Network Access (or allow all during development).
4. Copy connection string and set database name.

Example:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/job_portal?retryWrites=true&w=majority
```

## 2) Backend Environment Variables

A template is provided in `Backend/.env.example`.

Create `Backend/.env` with your own values:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_strong_secret
PORT=5011

CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API=your_cloudinary_api_key
API_SECRET=your_cloudinary_api_secret
```

Notes:
- Frontend currently calls backend on `http://localhost:5011`, so keep `PORT=5011` unless you also update frontend API constants.
- If Cloudinary keys are missing, features that upload files will fail.

## 3) Install Dependencies

Open terminal from project root:

```powershell
cd Backend
npm.cmd install
cd ../Frontend
npm.cmd install
```

If your PowerShell policy already allows npm normally, `npm install` also works.

## 4) Run the Project

Use two terminals.

Terminal 1 (Backend):

```powershell
cd Backend
npm.cmd run dev
```

You should see:
- `MongoDB Connected...`
- `Server is running on port 5011`

Terminal 2 (Frontend):

```powershell
cd Frontend
npm.cmd run dev
```

Open the Vite URL shown in terminal (usually `http://localhost:5173`).

## 5) Quick Verification Checklist

1. Backend starts without env errors.
2. MongoDB connected log appears.
3. Frontend opens on Vite URL.
4. API requests from frontend hit `http://localhost:5011/api/...`.

## Codebase Notes

- MongoDB connection is in `Backend/utils/db.js` using Mongoose.
- Backend entry is `Backend/index.js`.
- Frontend API base URLs are in `Frontend/src/utils/data.js`.

## Common First-Time Issues

1. `MONGO_URI` invalid: check username/password special characters in Atlas URI.
2. Atlas network blocked: add your IP in Atlas Network Access.
3. Wrong port: backend must match frontend API URLs (`5011` in this repo).
4. Cloudinary missing: registration/profile upload endpoints may fail until configured.

