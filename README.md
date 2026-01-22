# f/stop 64: Non-Destructive Photo Editor (SaaS Edition)

f/stop 64 is a professional-grade, browser-based photo editor built with React and the HTML5 Canvas API. It features a high-performance, non-destructive editing pipeline that calculates pixel values mathematically on-the-fly, similar to Adobe Lightroom.

## 🚀 SaaS Architecture

This version implements a "Tinker-First" freemium SaaS model designed to maximize user conversion by reducing friction.

### The "Export Gate" Workflow
1.  **Guest Access**: Anyone can upload photos and use 100% of the editing tools (Exposure, Contrast, HSL, Crop, etc.). The goal is for users to "fall in love" with the results before being asked for data.
2.  **The Logic Gate**: The login/paywall is only triggered when the user clicks **Export**.
    *   **Unauthenticated**: Prompted to sign in to claim their 30 free monthly exports.
    *   **Free Tier**: Allowed to export until the 30-export monthly limit is reached.
    *   **Pro Tier ($2/mo)**: Unlimited exports and advanced features.
3.  **Mock Mode**: If Supabase environment variables are missing, the app automatically runs in a local "Mock Mode," allowing you to test the full auth and payment flow without a backend.

## 🛠 Technical Stack

*   **Frontend**: React + Vite + Tailwind CSS.
*   **Engine**: Custom pixel-math engine (`engine.ts`) using `ImageData` manipulation via `requestAnimationFrame` for 60fps slider performance.
*   **Backend**: Supabase for Authentication and PostgreSQL for user profiles and quota tracking.
*   **State Management**: React Hooks + `useAuthSubscription` for syncing local state with the database.

## 🗄 Database Schema (Supabase)

To support this app, run the following SQL in your Supabase project:

```sql
-- Create profile table to track usage
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  is_pro boolean default false,
  export_count int default 0,
  quota_reset_date timestamp with time zone default timezone('utc'::text, now() + interval '1 month'),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Trigger to create profile on signup
create function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
```

## 📦 Deployment (GitHub Pages)

The app is optimized for GitHub Pages.

1.  **Environment Variables**: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your GitHub repository secrets.
2.  **Relative Pathing**: The app uses relative path imports to ensure it works correctly under subdirectories (e.g., `username.github.io/fstop64/`).
3.  **Build**: Run `npm run build`. The `index.html` is configured to work with ESM modules via CDNs, minimizing the need for complex build steps.

## 🎨 The Engine
The editing pipeline in `engine.ts` is purely mathematical. Unlike standard CSS filters, it applies:
*   **Luminance-Masked Tones**: Shadows/Highlights adjustments only affect specific brightness ranges.
*   **RGB-to-HSL Logic**: Saturation and Vibrance are calculated by converting pixels to HSL, manipulating them, and converting back.
*   **Non-Destructive**: Every frame is re-rendered from the original source data, ensuring zero generation loss during editing.

---
*Inspired by the Group f/64 photographic movement—striving for sharp images and maximum depth.*