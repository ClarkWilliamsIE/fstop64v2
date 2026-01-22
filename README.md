# f/stop 64: Non-Destructive Photo Editor (SaaS Edition)

f/stop 64 is a professional-grade, browser-based photo editor built with React and the HTML5 Canvas API. It features a high-performance, non-destructive editing pipeline that calculates pixel values mathematically on-the-fly, similar to Adobe Lightroom.

## 🚀 SaaS Architecture

This version implements a "Tinker-First" freemium SaaS model designed to maximize user conversion by reducing friction.

### The "Export Gate" Workflow
1.  **Guest Access**: Anyone can upload photos and use 100% of the editing tools.
2.  **The Logic Gate**: Authentication is only triggered when the user clicks **Export**.
3.  **Tiered Access**:
    *   **Unauthenticated**: Sign in to claim 30 free monthly exports.
    *   **Free Tier**: 30 exports per month.
    *   **Pro Tier ($2/mo)**: Unlimited exports.

## 📦 Deployment (Vercel)

Vercel is the recommended hosting platform for f/stop 64.

1.  **Push to GitHub**: Push this repository to your GitHub account.
2.  **Import to Vercel**: Connect your GitHub repo to a new project on Vercel.
3.  **Environment Variables**:
    *   Go to Project Settings > Environment Variables.
    *   Add `VITE_SUPABASE_URL` with your Supabase project URL.
    *   Add `VITE_SUPABASE_ANON_KEY` with your Supabase anon key.
4.  **Deploy**: Vercel will automatically detect the settings. No build command is required.

## 🗄 Database Schema (Supabase)

Run this SQL in your Supabase project to enable quotas:

```sql
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  is_pro boolean default false,
  export_count int default 0,
  quota_reset_date timestamp with time zone default timezone('utc'::text, now() + interval '1 month')
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);

create function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
```

---
*Inspired by the Group f/64 photographic movement—striving for sharp images and maximum depth.*