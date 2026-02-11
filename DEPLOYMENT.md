# Vercel Deployment Checklist

## Prerequisites

### 1. Environment Variables (Required)

Add these to your Vercel project settings:

| Variable                         | Value                                      | Source               |
| -------------------------------- | ------------------------------------------ | -------------------- |
| `DATABASE_URL`                   | Your Supabase Postgres URL                 | Supabase Dashboard   |
| `KINDE_CLIENT_ID`                | Your Kinde client ID                       | Kinde Dashboard      |
| `KINDE_CLIENT_SECRET`            | Your Kinde client secret                   | Kinde Dashboard      |
| `KINDE_ISSUER_URL`               | Your Kinde domain                          | Kinde Dashboard      |
| `KINDE_SITE_URL`                 | `https://your-domain.vercel.app`           | Vercel               |
| `KINDE_POST_LOGOUT_REDIRECT_URL` | `https://your-domain.vercel.app`           | Vercel               |
| `KINDE_POST_LOGIN_REDIRECT_URL`  | `https://your-domain.vercel.app/dashboard` | Vercel               |
| `COMPANY_WHATSAPP_NUMBER`        | `+91XXXXXXXXXX`                            | Your WhatsApp number |
| `SUPABASE_URL`                   | `https://yjalvnfxtsplkfsrrwhz.supabase.co` | Supabase Dashboard   |
| `SUPABASE_SERVICE_KEY`           | Your service role key                      | Supabase Dashboard   |
| `USE_DATABASE`                   | `true`                                     | Set to use real DB   |

### 2. Kinde Auth Configuration

In Kinde Dashboard, add these callback URLs:

- Allowed callback URLs: `https://your-domain.vercel.app/api/auth/success`
- Allowed logout redirect URLs: `https://your-domain.vercel.app`

### 3. Supabase Configuration

Ensure your Supabase project allows connections from Vercel IPs.

## Deployment Steps

1. **Push code to GitHub**

   ```bash
   git push origin main
   ```

2. **Import project in Vercel**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Framework preset: Next.js

3. **Set Environment Variables**
   - Copy all variables from above into Vercel project settings

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

## Post-Deployment

1. **Update Kinde URLs**
   - Update `KINDE_SITE_URL` to your actual Vercel domain
   - Update callback URLs in Kinde dashboard

2. **Verify**
   - Check homepage loads
   - Test location search
   - Test car reservation flow
   - Verify WhatsApp integration

## Troubleshooting

### Build fails with database error

- Check `DATABASE_URL` is correct
- Ensure Supabase allows Vercel IPs
- Set `USE_DATABASE=true`

### Images not loading

- Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Verify images exist in Supabase Storage bucket

### Auth not working

- Verify Kinde credentials
- Check callback URLs match exactly
- Ensure `KINDE_SITE_URL` matches Vercel domain
