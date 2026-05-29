# GymPro — Full Setup & Build Guide
## Production-Ready Android SaaS Gym Management App

---

## STEP 1 — Prerequisites

```bash
# Check versions (required)
node --version        # >= 18.x
npm --version         # >= 9.x
java --version        # JDK 17
echo $ANDROID_HOME    # /Users/yourname/Library/Android/sdk

# Install React Native CLI globally (optional, using npx is fine)
npm install -g react-native-cli
```

---

## STEP 2 — Install Dependencies

```bash
cd /Users/biswajit/localhost/react_native/GymManagement

# Install all packages
npm install

# Verify Android SDK tools
$ANDROID_HOME/tools/bin/sdkmanager --list | grep "build-tools"
```

---

## STEP 3 — Supabase Setup

### 3.1 Create Supabase Project
1. Go to https://supabase.com
2. Create new project
3. Copy **Project URL** and **Anon Key**

### 3.2 Run SQL Migrations
In Supabase Dashboard → SQL Editor, run in order:

```sql
-- Run file: supabase/migrations/001_initial_schema.sql
-- Run file: supabase/migrations/002_rls_policies.sql
```

### 3.3 Create Storage Buckets
In Supabase Dashboard → Storage:
- Create bucket: `gym-logos` (Public)
- Create bucket: `student-images` (Private)
- Create bucket: `payment-qr` (Private)
- Create bucket: `receipts` (Private)

---

## STEP 4 — Firebase Setup

### 4.1 Create Firebase Project
1. Go to https://console.firebase.google.com
2. Add Android app with package: `com.gymmanagement`
3. Download `google-services.json`
4. Place in: `android/app/google-services.json`

### 4.2 Enable Cloud Messaging
Firebase Console → Your App → Cloud Messaging → Enable

---

## STEP 5 — Environment Variables

```bash
# Copy example file
cp .env.example .env

# Edit .env with your values:
nano .env
```

```env
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_KEY
APP_NAME=GymPro
APP_ENV=development
```

---

## STEP 6 — Vector Icons Setup (Android)

Add to `android/app/build.gradle` inside `android {}`:

```gradle
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```

---

## STEP 7 — Run Debug Build (Android)

```bash
# Start Metro bundler (Terminal 1)
npx react-native start --reset-cache

# Run on Android device/emulator (Terminal 2)
npx react-native run-android

# Or with specific device
npx react-native run-android --deviceId YOUR_DEVICE_ID

# List connected devices
adb devices
```

---

## STEP 8 — Generate Debug APK

```bash
cd android

# Clean first
./gradlew clean

# Generate debug APK
./gradlew assembleDebug

# APK location:
# android/app/build/outputs/apk/debug/app-debug.apk

# Install directly to device
adb install app/build/outputs/apk/debug/app-debug.apk
```

---

## STEP 9 — Generate Release APK (Production)

### 9.1 Generate Keystore

```bash
cd android/app

keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore my-upload-key.keystore \
  -alias my-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

### 9.2 Update gradle.properties

```properties
MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=your_store_password
MYAPP_UPLOAD_KEY_PASSWORD=your_key_password
```

### 9.3 Build Release APK

```bash
cd android

# Clean
./gradlew clean

# Release APK
./gradlew assembleRelease

# APK location:
# android/app/build/outputs/apk/release/app-release.apk
```

### 9.4 Build Release AAB (Play Store)

```bash
cd android
./gradlew bundleRelease

# AAB location:
# android/app/build/outputs/bundle/release/app-release.aab
```

---

## STEP 10 — Install APK on Device

```bash
# Debug APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Release APK
adb install android/app/build/outputs/apk/release/app-release.apk

# Check device logs
adb logcat --pid=$(adb shell pidof com.gymmanagement) -v time
```

---

## STEP 11 — Production Deployment

### 11.1 Google Play Store
1. Build AAB: `./gradlew bundleRelease`
2. Create Play Console account
3. Upload `app-release.aab`
4. Set up app listing, screenshots
5. Review and publish

### 11.2 Direct APK Distribution
```bash
# Build release APK
./gradlew assembleRelease

# Share via:
# - Google Drive, WhatsApp, Direct download
# - Firebase App Distribution (recommended for beta)
```

---

## COMMON ISSUES & FIXES

### Metro bundler port conflict
```bash
npx react-native start --port 8082
```

### Android build cache issues
```bash
cd android && ./gradlew clean && cd ..
npx react-native start --reset-cache
```

### Dependency issues
```bash
rm -rf node_modules
npm install
cd android && ./gradlew clean
```

### Vector Icons not showing
Add to `android/app/build.gradle`:
```gradle
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```

### Supabase connection failed
- Check SUPABASE_URL and SUPABASE_ANON_KEY in .env
- Verify RLS policies allow your queries
- Check Supabase project is not paused (free tier pauses after 1 week)

### FCM not receiving notifications
- Verify `google-services.json` is in `android/app/`
- Check Firebase project has Cloud Messaging enabled
- Test with Firebase Console → Cloud Messaging → Send test message

---

## PROJECT STRUCTURE

```
GymManagement/
├── android/                    # Android native code
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── java/com/gymmanagement/
│   │   │   │   ├── MainActivity.kt
│   │   │   │   └── MainApplication.kt
│   │   │   └── res/
│   │   └── build.gradle
│   ├── build.gradle
│   └── gradle.properties
├── src/
│   ├── components/
│   │   ├── common/             # AppButton, AppInput, StatCard, etc.
│   │   └── skeletons/          # Loading skeletons
│   ├── constants/              # Colors, spacing, app constants
│   ├── navigation/             # AppNavigator, Admin/Manager/TrainerTabs
│   ├── screens/
│   │   ├── auth/               # Login, RegisterGym, Splash
│   │   ├── admin/              # AdminDashboard, UserManagement
│   │   ├── manager/            # ManagerDashboard
│   │   ├── trainer/            # TrainerDashboard
│   │   └── shared/             # Students, Expenses, Reports, etc.
│   ├── services/               # Supabase API calls
│   ├── store/                  # Zustand stores
│   ├── supabase/               # Supabase client
│   └── types/                  # TypeScript interfaces
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_rls_policies.sql
├── App.tsx                     # Root component
├── index.js                    # Entry point
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── .env                        # YOUR credentials (never commit)
└── .env.example                # Template
```

---

## FEATURE CHECKLIST

- [x] Multi-Gym SaaS Architecture
- [x] Gym Owner Onboarding (Logo + QR Upload)
- [x] Role-Based Access Control (Admin/Manager/Trainer)
- [x] Supabase Auth (Email/Password)
- [x] Row Level Security (All tables)
- [x] Admin Dashboard (9 stat cards)
- [x] Manager Dashboard
- [x] Trainer Dashboard
- [x] Student Management (Add/Edit/Delete/Detail)
- [x] Student Verification Workflow
- [x] Membership Expiry Alerts (3d/7d/Expired)
- [x] Call Button on Student Cards
- [x] Expense Module (CRUD + Categories)
- [x] Trainer Salary Module
- [x] Packages Module (5 types)
- [x] Revenue/Expense/Profit Reports
- [x] Charts (Line + Pie)
- [x] Firebase Cloud Messaging
- [x] Push Notifications
- [x] Gym Settings (Logo/QR update)
- [x] Staff Management
- [x] Dark Mode
- [x] Search + Filters
- [x] Pagination (infinite scroll)
- [x] Loading Skeletons
- [x] Empty States
- [x] Error Boundaries
- [x] Toast Messages
- [x] Confirmation Dialogs
- [x] TypeScript Strict Mode
- [x] Clean Architecture
- [x] Zustand State Management
- [x] React Hook Form + Zod Validation
- [x] Supabase Storage (Images/QR)
- [x] Image Picker Integration
