# Codebase Structure and Glass Animation Background

## 📁 **Project Structure**

```
MERN-COP4331-Group5/
├── api.js                          # Backend API endpoints
├── server.js                       # Express server setup
├── createJWT.js                    # JWT token creation utilities
├── touch.env                       # Environment variables (MongoDB, JWT, SendGrid)
├── package.json                     # Backend dependencies
├── package-lock.json               # Backend dependency lock file
├── node_modules/                   # Backend dependencies
├── frontend/                       # React frontend application
│   ├── src/
│   │   ├── components/             # React components
│   │   │   ├── Login.tsx           # Login page component
│   │   │   ├── Register.tsx        # Registration page component
│   │   │   ├── VerifyEmail.tsx     # Email verification component
│   │   │   ├── ForgotPassword.tsx  # Forgot password component
│   │   │   ├── TodoUI.tsx          # Main todo interface with timeline
│   │   │   ├── TimelineGrid.tsx    # Timeline visualization component
│   │   │   ├── DateNavigator.tsx   # Date navigation component
│   │   │   ├── CompletionMessage.tsx # Task completion feedback component
│   │   │   ├── LoggedInName.tsx    # User name display
│   │   │   ├── Path.tsx            # API path builder
│   │   │   └── tokenStorage.tsx    # JWT token management
│   │   ├── pages/                  # Page wrapper components
│   │   │   ├── LoginPage.tsx       # Login page wrapper
│   │   │   ├── RegisterPage.tsx    # Register page wrapper
│   │   │   └── TodoPage.tsx        # Todo page wrapper
│   │   ├── App.tsx                 # Main app component with routing
│   │   ├── App.css                 # Global app styles (includes glass/blob styles)
│   │   ├── index.css               # Global styles
│   │   ├── main.tsx                # React app entry point
│   │   └── assets/                 # Static assets
│   ├── package.json                # Frontend dependencies
│   ├── package-lock.json           # Frontend dependency lock file
│   ├── vite.config.ts              # Vite configuration
│   ├── tsconfig.json               # TypeScript configuration
│   ├── tsconfig.app.json           # TypeScript app config
│   ├── tsconfig.node.json          # TypeScript node config
│   ├── eslint.config.js            # ESLint configuration
│   ├── index.html                  # HTML template
│   ├── README.md                   # Frontend documentation
│   └── node_modules/               # Frontend dependencies
├── Codebase-Structure-and-Glass-Animation-Background.md

```

## 🎨 **Soft-Glass Design System**

### **Design Philosophy**
The application uses a **Soft-Glass Design System** (also known as "Glassmorphism") that creates a modern, elegant, and visually appealing user interface. This design system emphasizes:

- **Translucency**: Semi-transparent elements that allow background content to show through
- **Frosted Glass Effect**: Backdrop blur creates a frosted glass appearance
- **Soft Shadows**: Elevation through subtle shadows rather than harsh borders
- **Smooth Animations**: Gentle transitions and floating animations for a polished feel
- **Color Harmony**: Carefully selected color palette with indigo, mint, and pink accents

### **Core Design Tokens**

All design tokens are defined as CSS custom properties in `:root` within `App.css`:

```css
:root {
  /* Primary Colors */
  --indigo: #6C63FF;        /* Primary accent color */
  --indigo-600: #5A53F2;    /* Darker indigo for hover states */
  --indigo-700: #4F48E0;    /* Darkest indigo for active states */
  --mint: #00C2A8;          /* Secondary accent color */
  
  /* Background Colors */
  --bg-top: #EAF6F2;        /* Top gradient color (mint-tinted) */
  --bg-bottom: #F7F5FF;     /* Bottom gradient color (indigo-tinted) */
  
  /* Text Colors */
  --text: #1F2937;          /* Primary text color */
  --muted: #6B7280;         /* Secondary/muted text color */
  --border: #E5E7EB;        /* Border color */
  --error: #EF4444;         /* Error/red color */
  
  /* Border Radius */
  --r-lg: 22px;             /* Large radius (modals, cards) */
  --r-md: 14px;             /* Medium radius (buttons, inputs) */
  --r-sm: 12px;             /* Small radius (badges, small elements) */
  --r-full: 9999px;         /* Fully rounded (pill-shaped badges) */
  
  /* Spacing Scale */
  --space-4: 4px;
  --space-8: 8px;
  --space-12: 12px;
  --space-16: 16px;
  --space-20: 20px;
  --space-24: 24px;
  --space-32: 32px;
  --space-48: 48px;
  --space-64: 64px;
  
  /* Elevation/Shadows */
  --elev-xl: 0 24px 48px rgba(2,8,23,.12), 0 2px 6px rgba(2,8,23,.06);
  --focus: 0 0 0 3px rgba(108,99,255,.15);
  
  /* Typography */
  --font-xs: 12px;
  --font-sm: 13px;
  --font-base: 16px;
  --font-lg: 18px;
  --font-xl: 20px;
  --font-2xl: 24px;
  --font-3xl: 32px;
  --font-4xl: 40px;
  
  /* Font Weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;
  
  /* Line Heights */
  --leading-tight: 120%;
  --leading-normal: 140%;
  --leading-relaxed: 150%;
}
```

## 🔮 **Glass Style (Glassmorphism)**

### **Glass Card Component**

The `.glass` class creates the signature frosted glass effect used throughout the application:

```css
.glass {
  width: min(420px, 92vw);
  padding: var(--space-24);
  border-radius: var(--r-lg);
  background: linear-gradient(180deg, rgba(255,255,255,.72), rgba(255,255,255,.58));
  border: 1px solid rgba(255,255,255,.75);
  backdrop-filter: blur(14px) saturate(120%);
  -webkit-backdrop-filter: blur(14px) saturate(120%);
  box-shadow: var(--elev-xl);
  position: relative;
  z-index: 1;
  max-height: calc(90vh - 80px);
  overflow-y: auto;
  overflow-x: hidden;
}
```

### **Key Glass Properties Explained:**

1. **Semi-Transparent Background**: 
   - `background: linear-gradient(180deg, rgba(255,255,255,.72), rgba(255,255,255,.58))`
   - Creates a gradient from 72% to 58% white opacity
   - Allows background content to show through subtly

2. **Backdrop Filter (Frosted Glass Effect)**:
   - `backdrop-filter: blur(14px) saturate(120%)`
   - `blur(14px)`: Blurs content behind the element (creates frosted glass effect)
   - `saturate(120%)`: Slightly increases color saturation for vibrancy
   - `-webkit-backdrop-filter`: Vendor prefix for Safari/older browsers

3. **Subtle Border**:
   - `border: 1px solid rgba(255,255,255,.75)`
   - Semi-transparent white border defines the glass edge
   - Creates separation without harsh lines

4. **Elevation Shadow**:
   - `box-shadow: var(--elev-xl)`
   - Multi-layer shadow creates depth and elevation
   - Makes glass cards appear to float above the background

5. **Overlay Effect**:
   - `.glass::before` pseudo-element adds a subtle gradient overlay
   - `mix-blend-mode: soft-light` creates a soft lighting effect
   - Enhances the glass appearance

### **Glass Variations:**

- **`.glass--float`**: Adds floating animation to glass cards
- **`.login-modal`**: Glass modal container for dialogs
- **`.timeline-sidebar`**: Glass sidebar for task details
- **`.todo-card`**: Glass card for task items

## 🎭 **Animated Background Blobs**

### **Blob System Overview**

The application features animated, floating background blobs that add depth and visual interest to the page. These blobs are positioned absolutely and animate continuously to create a dynamic, living background.

### **Blob Properties:**

```css
.blob {
  position: fixed;
  z-index: 0;
  pointer-events: none;
  width: 620px;
  height: 620px;
  border-radius: 50%;
  filter: blur(12px);
  opacity: 0.65;
  mix-blend-mode: normal;
  animation: blob-float 5s ease-in-out infinite;
  will-change: transform;
}
```

### **Blob Variants:**

#### **1. Indigo Blob (Top-Left)**
```css
.blob--indigo {
  top: -100px;
  left: -100px;
  background: radial-gradient(closest-side, rgba(108,99,255,.85), rgba(108,99,255,.18) 60%, transparent 100%);
  animation-duration: 4s;
}
```
- **Position**: Top-left corner (partially off-screen)
- **Color**: Indigo/purple gradient
- **Animation**: 4-second floating cycle
- **Purpose**: Primary accent blob, adds indigo tint to top-left area

#### **2. Mint Blob (Bottom-Right)**
```css
.blob--mint {
  right: -100px;
  bottom: -100px;
  background: radial-gradient(closest-side, rgba(0,194,168,.80), rgba(0,194,168,.18) 60%, transparent 100%);
  animation-duration: 5s;
  animation-delay: -1s;
}
```
- **Position**: Bottom-right corner (partially off-screen)
- **Color**: Mint/teal gradient
- **Animation**: 5-second floating cycle with 1-second delay
- **Purpose**: Secondary accent blob, adds mint tint to bottom-right area

#### **3. Pink Blob (Center-Bottom)**
```css
.blob--pink {
  bottom: -120px;
  left: calc(50% - 240px);
  width: 480px;
  height: 480px;
  background: radial-gradient(closest-side, rgba(255,122,182,.75), rgba(255,122,182,.20) 60%, transparent 100%);
  animation-duration: 7s;
  animation-delay: -2s;
  opacity: 0.55;
}
```
- **Position**: Center-bottom (partially off-screen)
- **Color**: Pink gradient
- **Size**: Smaller (480px vs 620px)
- **Animation**: 7-second floating cycle with 2-second delay
- **Purpose**: Tertiary accent blob, adds pink tint to center area

### **Blob Animation (Floating Effect)**

```css
@keyframes blob-float {
  0%   { transform: translate(0,0) scale(1); }
  25%  { transform: translate(50px,-100px) scale(1.05); }
  50%  { transform: translate(-40px,-70px) scale(1.04); }
  75%  { transform: translate(35px,-110px) scale(1.06); }
  100% { transform: translate(0,0) scale(1); }
}
```

**Animation Characteristics:**
- **Type**: Infinite looping animation
- **Duration**: 4-7 seconds (varies by blob)
- **Easing**: `ease-in-out` for smooth acceleration/deceleration
- **Movement**: Translates in X and Y directions with slight scaling
- **Effect**: Creates organic, floating motion that never repeats exactly the same way
- **Performance**: Uses `will-change: transform` for GPU acceleration

### **Blob Design Principles:**

1. **Layered Background**: Blobs sit behind all content (`z-index: 0`)
2. **No Interaction**: `pointer-events: none` ensures blobs don't interfere with clicks
3. **Soft Edges**: `filter: blur(12px)` creates soft, organic edges
4. **Gradient Transparency**: Radial gradients fade to transparent for seamless blending
5. **Different Speeds**: Each blob animates at different speeds for natural movement
6. **Staggered Delays**: Animation delays create asynchronous movement

## 🎬 **Animation System**

### **Page-Level Animations**

#### **1. Page Fade-In**
```css
@keyframes page-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```
- **Applied to**: `.login-page`
- **Duration**: 0.6s
- **Purpose**: Smooth page entry animation

#### **2. Topbar Slide-Down**
```css
@keyframes topbar-slide-down {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```
- **Applied to**: `.topbar`
- **Duration**: 0.5s
- **Purpose**: Topbar slides down from top on page load

### **Component Animations**

#### **3. Card Float Animation**
```css
@keyframes card-float {
  0%   { transform: translateY(0); }
  50%  { transform: translateY(-4px); }
  100% { transform: translateY(0); }
}
```
- **Applied to**: `.glass--float`
- **Duration**: 9s
- **Purpose**: Subtle vertical floating motion for glass cards

#### **4. Fade-In Animations**
```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fade-in-down {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fade-in-left {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}
```
- **Purpose**: Various entry animations for components
- **Usage**: Login forms, buttons, content sections

### **Background Texture**

The page includes a subtle texture overlay for added depth:

```css
.login-page::after {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml;utf8,<svg...>");
  mix-blend-mode: multiply;
}
```

- **SVG Pattern**: Fractal noise texture
- **Opacity**: Very subtle (0.025)
- **Blend Mode**: Multiply for natural integration
- **Purpose**: Adds texture without being distracting

### **Animation Performance**

- **GPU Acceleration**: `will-change: transform` on animated elements
- **Reduced Motion Support**: Animations disabled for users who prefer reduced motion:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .blob, .glass--float {
      animation: none !important;
      transform: none !important;
    }
  }
  ```

## 🌈 **Background System**

### **Multi-Layer Background**

The page background uses a sophisticated multi-layer approach:

```css
.login-page {
  background:
    /* Layer 4: Radial gradient overlay (subtle darkening) */
    radial-gradient(120% 140% at 50% 0%, rgba(0,0,0,.04), transparent 60%),
    /* Layer 3: Mint blob area gradient */
    radial-gradient(900px 500px at 110% -5%, rgba(0,194,168,.10), transparent 55%),
    /* Layer 2: Indigo blob area gradient */
    radial-gradient(800px 460px at -10% 110%, rgba(108,99,255,.12), transparent 55%),
    /* Layer 1: Base gradient (mint to indigo) */
    linear-gradient(180deg, var(--bg-top) 0%, var(--bg-bottom) 100%);
}
```

### **Layer Breakdown:**

1. **Base Gradient** (Bottom Layer):
   - Linear gradient from mint-tinted top (`#EAF6F2`) to indigo-tinted bottom (`#F7F5FF`)
   - Creates the primary color foundation

2. **Indigo Area Gradient**:
   - Radial gradient positioned to enhance indigo blob area
   - Adds depth where indigo blob appears

3. **Mint Area Gradient**:
   - Radial gradient positioned to enhance mint blob area
   - Adds depth where mint blob appears

4. **Subtle Overlay**:
   - Dark radial gradient at top for subtle depth
   - Creates natural lighting effect

### **Background Principles:**

- **Layered Approach**: Multiple gradients create depth
- **Color Harmony**: Gradients complement blob colors
- **Soft Transitions**: All gradients fade to transparent for seamless blending
- **Performance**: CSS-only (no images) for fast rendering

## 🔧 **Key Technologies & Concepts**

### **MERN Stack Components:**
- **MongoDB**: NoSQL database for storing users and todos
- **Express.js**: Backend web framework for API endpoints
- **React**: Frontend library for building user interfaces
- **Node.js**: JavaScript runtime for backend server

### **Authentication & Security:**
- **JWT (JSON Web Token)**: Token-based authentication system
- **CORS (Cross-Origin Resource Sharing)**: Handles cross-domain requests
- **SendGrid**: Email service for verification and password reset emails
- **localStorage**: Browser storage for user data and tokens

### **Frontend Tools:**
- **Vite**: Fast build tool and development server
- **React Router DOM**: Client-side routing for navigation
- **TypeScript**: Type-safe JavaScript for better development experience
- **ESLint**: Code linting and formatting

### **Design System Technologies:**
- **CSS Custom Properties**: Design tokens for consistent styling
- **Backdrop Filter**: Modern CSS for glassmorphism effects
- **CSS Animations**: Smooth, performant animations
- **CSS Gradients**: Multi-layer backgrounds and blob effects

### **Development & Deployment:**
- **Git/GitHub**: Version control and collaboration
- **Digital Ocean Droplet**: Production server hosting
- **Nginx**: Web server for serving static files and reverse proxy
- **SSH**: Secure remote server access

## 🚀 **Backend API Endpoints**

### **Authentication Endpoints:**
- `POST /api/login` - User authentication
- `POST /api/register` - User registration
- `POST /api/request-email-verification` - Send verification email
- `POST /api/verify-email` - Verify email with 6-digit code
- `GET /api/verify-email-link` - Verify email via magic link

### **Password Reset Endpoints:**
- `POST /api/request-password-reset` - Send password reset email
- `POST /api/reset-password-with-code` - Reset password with 6-digit code
- `POST /api/reset-password-with-token` - Reset password with token (magic link)

### **Todo Management Endpoints:**
- `POST /api/addtodo` - Create new todo
- `POST /api/edittodo` - Update existing todo
- `POST /api/deletetodo` - Delete todo
- `POST /api/gettodos` - Get all user todos
- `POST /api/check` - Toggle todo completion status
- `POST /api/check-bulk` - Bulk toggle todo completion
- `POST /api/next-day` - Move todo due date forward by one day

### **Todo Analytics Endpoints:**
- `POST /api/current` - Get categorized incomplete todos
- `POST /api/previous` - Get categorized completed todos

## 🚀 **Complete Deployment Guide**

### **Step-by-Step Deployment Process:**

#### **Step 1: Check Current Status**
```bash
# Check what files you've modified
git status

# See what changes you've made
git diff
```

#### **Step 2: Add Your Changes**
```bash
# Add all modified files to staging
git add .
```

#### **Step 3: Commit Your Changes**
```bash
# Commit with a descriptive message
git commit -m "Implement complete password reset flow with separate pages"
```

#### **Step 4: Push to GitHub**
```bash
# Push your henry-dev branch to GitHub
git push origin henry-dev
```

#### **Step 5: Merge to Main Branch**
```bash
# Switch to main branch
git checkout main

# Pull latest changes (in case others pushed)
git pull origin main

# Merge your henry-dev branch
git merge henry-dev

# Push merged changes to main
git push origin main
```

#### **Step 6: Deploy to Server**
```bash
# SSH into server
ssh root@cop4331-group5.xyz

# Navigate to project root
cd /var/todoApp

# Pull latest code
git pull origin main

# Navigate to frontend
cd frontend

# Build and deploy
npm run build
sudo rm -rf /var/www/html/*
sudo cp -r /var/todoApp/frontend/dist/* /var/www/html/
sudo systemctl reload nginx

# Exit
exit
```

### **Complete Command Sequence (Copy-Paste Ready):**
```bash
# 1. Check status
git status

# 2. Add changes
git add .

# 3. Commit
git commit -m "Your commit message"

# 4. Push to GitHub
git push origin henry-dev

# 5. Switch to main and merge
git checkout main
git pull origin main
git merge henry-dev
git push origin main

# 6. SSH to server and deploy
ssh root@your-droplet-ip
cd /var/todoApp
git pull origin main
npm install
cd frontend
npm install
npm run build
sudo rm -rf /var/www/html/*
sudo cp -r /var/todoApp/frontend/dist/* /var/www/html/
sudo systemctl reload nginx
exit
```

### **Frontend Build Process:**
```bash
# Build frontend for production
npm run build

# This creates a 'dist' folder with optimized files
```

### **Server Deployment Commands:**
```bash
# Remove old files from web server
sudo rm -rf /var/www/html/*

# Copy new build to web server
sudo cp -r /var/todoApp/frontend/dist/* /var/www/html/

# Reload nginx to serve new files
sudo systemctl reload nginx
```

### **Git Workflow:**
```bash
# After making changes, push to GitHub
git add .
git commit -m "Your commit message"
git push origin henry-dev
```

## 🔍 **Environment Configuration**

### **Backend Environment (touch.env):**
```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
DB_NAME=TodoApp
ACCESS_TOKEN_SECRET=your-secret-key-here
TOKEN_EXPIRATION=1d
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
SENDGRID_FROM="ToDo <your-email@gmail.com>"
SENDGRID_TEMPLATE_VERIFY=
SENDGRID_TEMPLATE_RESET=
FRONTEND_BASE_URL=http://localhost:5173
BACKEND_BASE_URL=http://localhost:5000
DEBUG_EMAIL=true
```

### **Frontend Environment:**
- **Development**: Uses Vite dev server on `http://localhost:5173`
- **Production**: Built files served via Nginx on Digital Ocean droplet
- **API Calls**: Uses `buildPath()` function to construct API URLs

## 📊 **Current Status Summary**

### **✅ Completed:**
- Login page with modern Soft-Glass UI design
- Register page with consistent styling
- Email verification page with consistent styling
- Forgot password page with two-step flow
- Reset password page with token validation
- Complete password reset functionality
- JWT token handling and user authentication
- Email verification system
- CORS configuration for development
- Home page with timeline grid visualization
- Complete task management system
- Soft-Glass design system implementation
- Animated background blobs
- Full accessibility support

### **⏳ Next Priority:**
- Production deployment testing
- Cross-browser testing
- Performance optimization

## 🎯 **Implementation Notes**

### **Design System Usage:**
- All components use the Soft-Glass design system for consistency
- Glass cards use `.glass` class for frosted glass effect
- Blobs are added to pages using `.blob` classes with color variants
- Animations are applied through CSS classes and keyframes
- Design tokens ensure consistent spacing, colors, and typography

### **Animation Best Practices:**
- All animations respect `prefers-reduced-motion` media query
- GPU-accelerated properties (`transform`, `opacity`) are used for performance
- `will-change` is used sparingly and only on animated elements
- Infinite animations use `ease-in-out` for natural motion

### **Browser Compatibility:**
- `backdrop-filter` requires `-webkit-` prefix for Safari
- Fallbacks are provided for browsers without backdrop-filter support
- Animations degrade gracefully for older browsers

## 🔗 **API Endpoint Details**

### **Password Reset Flow:**

#### **Step 1: Request Reset**
- **Endpoint**: `POST /api/request-password-reset`
- **Input**: `{ email: string }` or `{ login: string }`
- **Output**: `{ sent: boolean, error: string }`
- **Action**: Sends email with 6-digit code and reset link

#### **Step 2A: Reset with Code**
- **Endpoint**: `POST /api/reset-password-with-code`
- **Input**: `{ login: string, code: string, newPassword: string }`
- **Output**: `{ error: string }`
- **Action**: Validates code and updates password

#### **Step 2B: Reset with Token**
- **Endpoint**: `POST /api/reset-password-with-token`
- **Input**: `{ login: string, token: string, newPassword: string }`
- **Output**: `{ error: string }`
- **Action**: Validates token and updates password

### **Email Configuration:**
- **SendGrid**: Configured for sending verification and reset emails
- **Templates**: Can use dynamic templates or simple HTML
- **Debug Mode**: `DEBUG_EMAIL=true` shows codes/links in console
- **Links**: Reset links point to `${FRONTEND_BASE_URL}/reset-password?login=xxx&token=xxx`

## 📚 **Additional Resources**

### **Design System References:**
- **Glassmorphism**: Modern UI trend using backdrop-filter for frosted glass effects
- **CSS Backdrop Filter**: MDN documentation for backdrop-filter property
- **CSS Custom Properties**: Design tokens using CSS variables
- **CSS Animations**: Keyframe animations for smooth transitions

### **Performance Considerations:**
- Backdrop-filter can be performance-intensive on low-end devices
- Blob animations use GPU acceleration for smooth performance
- Reduced motion support ensures accessibility
- Will-change property used strategically for optimization

