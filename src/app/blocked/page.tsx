import { signOut } from "@/app/actions/auth";

export default function Blocked() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="card max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold">אין גישה כרגע</h1>
        <p className="mt-2 text-stone-500">החשבון שלך עדיין לא משויך לעסק פעיל, או שהגישה הושבתה. פנה למנהל המערכת.</p>
        <form action={signOut} className="mt-6">
          <button className="btn-ghost">התנתקות</button>
        </form>
      </div>
    </main>
  );
}
