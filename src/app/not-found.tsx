import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="text-center">
        <div className="text-7xl font-black text-brand/20">404</div>
        <h1 className="mt-2 text-2xl font-bold">הדף לא נמצא</h1>
        <p className="mt-1 text-stone-500">ייתכן שהקישור שגוי או שהדף הוסר.</p>
        <Link href="/" className="btn-primary mt-6">חזרה לדף הבית</Link>
      </div>
    </main>
  );
}
