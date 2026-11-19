export default function EnDesarrollo({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <section className="rounded-lg border border-dashed border-slate-600 p-6">
      <h1 className="text-xl font-semibold">{titulo}</h1>
      <p className="mt-2 text-slate-400">{detalle}</p>
    </section>
  );
}
