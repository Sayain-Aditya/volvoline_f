import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getInvoice, saveInvoice, updateInvoice, getNextInvoiceNumber } from "../../api/invoiceApi";
import mksLogo from "../../assets/MKS Logo (1).png";
import volvlineLogo from "../../assets/volvline.jpg";

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const below100 = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : ""));
const below1000 = (n) =>
  (n >= 100 ? ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " : "") : "") + (n % 100 ? below100(n % 100) : "");
const words = (n) => {
  if (n === 0) return "Zero";
  const parts = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thou = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(below1000(crore) + " Crore");
  if (lakh) parts.push(below100(lakh) + " Lakh");
  if (thou) parts.push(below100(thou) + " Thousand");
  if (rest) parts.push(below1000(rest));
  return parts.join(" ");
};
const rupeesInWords = (amount) => {
  const total = Math.round(amount * 100);
  const r = Math.floor(total / 100);
  const p = total % 100;
  let s = "INR " + words(r);
  if (p) s += " and " + below100(p) + " paise";
  return s + " Only";
};

const todayStr = () =>
  new Date()
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })
    .replace(/ /g, "-");

const emptyParty = { name: "", address: "", gstin: "", state: "Uttar Pradesh", code: "09" };

const buildInitial = (invoiceNo = "") => ({
  seller: {
    name: "MKS Alliance LLP - Vns",
    address: "Grand Trunk Road, Khajuri,\nMirzamurad\nVaranasi\nUttar Pradesh- 221307",
    gstin: "09ACCFM8309C1ZC",
    state: "Uttar Pradesh",
    code: "09",
    contact: "9277802274",
  },
  consignee: { ...emptyParty },
  buyer: { ...emptyParty },
  sameAsBuyer: true,
  meta: {
    invoiceNo,
    date: todayStr(),
    deliveryNote: "", reference: "", buyerOrderNo: "", dispatchDocNo: "",
    dispatchedThrough: "", paymentTerms: "", otherReferences: "", destination: "", termsOfDelivery: "",
  },
  items: [{ id: 1, desc: "", hsn: "", qty: 1, unit: "NOS", rate: 0, disc: 0 }],
  gstRate: 18,
  salesperson: { name: "", contact: "" },
  declaration: "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
});

const inputCls = "w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

const Field = ({ label, children, className = "" }) => (
  <label className={"block " + className}>
    <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
    {children}
  </label>
);

const Section = ({ title, children, right }) => (
  <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-zinc-800">{title}</h3>
      {right}
    </div>
    {children}
  </section>
);

const PartyForm = ({ value, onChange, withContact }) => (
  <div className="grid grid-cols-2 gap-3">
    <Field label="Name" className="col-span-2">
      <input className={inputCls} value={value.name} onChange={(e) => onChange({ name: e.target.value })} />
    </Field>
    <Field label="Address" className="col-span-2">
      <textarea rows={3} className={inputCls} value={value.address} onChange={(e) => onChange({ address: e.target.value })} />
    </Field>
    <Field label="GSTIN / UIN" className="col-span-2">
      <input className={inputCls} value={value.gstin} onChange={(e) => onChange({ gstin: e.target.value.toUpperCase() })} />
    </Field>
    <Field label="State">
      <input className={inputCls} value={value.state} onChange={(e) => onChange({ state: e.target.value })} />
    </Field>
    <Field label="State code">
      <input className={inputCls} value={value.code} onChange={(e) => onChange({ code: e.target.value })} />
    </Field>
    {withContact && (
      <Field label="Contact" className="col-span-2">
        <input className={inputCls} value={value.contact || ""} onChange={(e) => onChange({ contact: e.target.value })} />
      </Field>
    )}
  </div>
);

export default function InvoiceSplitView({ initialData }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(() => {
    const base = buildInitial();
    if (!initialData) return base;
    return {
      ...base,
      ...initialData,
      seller: { ...base.seller, ...initialData.seller },
      buyer: { ...base.buyer, ...initialData.buyer },
      consignee: { ...base.consignee, ...initialData.consignee },
      meta: { ...base.meta, ...initialData.meta },
      items: initialData.items
        ? initialData.items.map((it, i) => ({ id: i + 1, disc: 0, unit: 'NOS', ...it }))
        : base.items,
    };
  });
  const [docId, setDocId] = useState(id || null);
  const docIdRef = useRef(id || null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const paneRef = useRef(null);
  const [scale, setScale] = useState(1);
  const isFirstRender = useRef(true);
  const skipNextAutosave = useRef(false);
  const autoSaveTimer = useRef(null);

  useEffect(() => {
    if (id) {
      getInvoice(id).then((p) => {
        const { _id, totals, createdAt, updatedAt, __v, ...rest } = p;
        setData({ ...buildInitial(), ...rest });
        setDocId(_id);
        docIdRef.current = _id;
        skipNextAutosave.current = true;
      }).catch(() => setSaveMsg("Failed to load invoice"));
    } else {
      getNextInvoiceNumber().then((d) =>
        setData((prev) => ({ ...prev, meta: { ...prev.meta, invoiceNo: d.nextInvoiceNumber } }))
      ).catch(console.error);
    }
  }, [id]);

  useEffect(() => {
    const el = paneRef.current;
    if (!el) return;
    const A4_PX = 794;
    const update = () => setScale(Math.min(1, (el.clientWidth - 32) / A4_PX));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (skipNextAutosave.current) { skipNextAutosave.current = false; return; }
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { doSave().catch(() => {}); }, 2000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [data]);

  const set = (key, patch) => setData((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  const setItem = (itemId, patch) =>
    setData((d) => ({ ...d, items: d.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }));
  const addItem = () =>
    setData((d) => ({ ...d, items: [...d.items, { id: Date.now(), desc: "", hsn: "", qty: 1, unit: "NOS", rate: 0, disc: 0 }] }));
  const removeItem = (itemId) =>
    setData((d) => ({ ...d, items: d.items.length > 1 ? d.items.filter((i) => i.id !== itemId) : d.items }));

  const calc = useMemo(() => {
    const lines = data.items.filter((it) => it.desc || it.rate > 0).map((it) => {
      const amount = Math.round(it.qty * it.rate * (1 - (it.disc || 0) / 100) * 100) / 100;
      return { ...it, amount };
    });
    const taxable = lines.reduce((s, l) => s + l.amount, 0);
    const half = data.gstRate / 2;
    const cgst = Math.round(taxable * half) / 100;
    const sgst = cgst;
    const raw = taxable + cgst + sgst;
    const total = Math.round(raw);
    const roundOff = Math.round((total - raw) * 100) / 100;
    const totalQty = lines.reduce((s, l) => s + Number(l.qty || 0), 0);
    const byHsn = {};
    lines.forEach((l) => { byHsn[l.hsn] = (byHsn[l.hsn] || 0) + l.amount; });
    const hsnRows = Object.entries(byHsn).map(([hsn, value]) => {
      const c = Math.round(value * half) / 100;
      return { hsn, value, cgst: c, sgst: c, tax: c * 2 };
    });
    return { lines, taxable, half, cgst, sgst, roundOff, total, totalQty, hsnRows, taxTotal: cgst + sgst };
  }, [data.items, data.gstRate]);

  const doSave = async ({ throwOnError = false } = {}) => {
    setSaving(true); setSaveMsg("");
    try {
      const payload = { ...data, totals: calc };
      if (docIdRef.current) {
        await updateInvoice(docIdRef.current, payload);
        setSaveMsg("Saved");
      } else {
        const saved = await saveInvoice(payload);
        setDocId(saved._id);
        docIdRef.current = saved._id;
        setSaveMsg("Saved");
      }
    } catch (error) {
      setSaveMsg(`Save failed: ${error.message}`);
      if (throwOnError) throw error;
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  };

  const handlePrint = () => window.print();

  const consignee = data.sameAsBuyer ? data.buyer : data.consignee;
  const unitLabel = data.items[0]?.unit || "";
  const [mobileTab, setMobileTab] = useState('form');

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-zinc-100">
      {/* Mobile tab switcher */}
      <div className="md:hidden flex border-b border-zinc-200 bg-white shrink-0">
        <button onClick={() => setMobileTab('form')} className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mobileTab === 'form' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-zinc-500'}`}>Form</button>
        <button onClick={() => setMobileTab('preview')} className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mobileTab === 'preview' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-zinc-500'}`}>Preview</button>
      </div>
      {/* LEFT: FORM */}
      <div id="form-panel" className={`${mobileTab === 'form' ? 'flex' : 'hidden'} md:flex flex-col h-full md:w-[42%] md:min-w-[340px] shrink-0 overflow-y-auto border-r border-zinc-200 bg-zinc-50 p-4`}>
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate("/")} className="text-zinc-500 hover:text-zinc-800 text-lg">&larr;</button>
              <div>
                <h1 className="text-lg font-semibold text-zinc-900">{docId ? "Edit Quotation" : "New Quotation"}</h1>
                <p className="text-xs text-zinc-500">Changes appear instantly in the preview.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saving && <span className="text-xs text-blue-600">Saving…</span>}
              {!saving && saveMsg && <span className="text-xs text-green-600">{saveMsg}</span>}
              <button onClick={() => doSave()} disabled={saving} className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">Save</button>
              <button onClick={handlePrint} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">Print / PDF</button>
            </div>
          </div>

          <Section title="Quotation details">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quotation No.">
                <input className={inputCls} value={data.meta.invoiceNo} onChange={(e) => set("meta", { invoiceNo: e.target.value })} />
              </Field>
              <Field label="Dated">
                <input className={inputCls} value={data.meta.date} onChange={(e) => set("meta", { date: e.target.value })} />
              </Field>
              <Field label="Delivery note">
                <input className={inputCls} value={data.meta.deliveryNote} onChange={(e) => set("meta", { deliveryNote: e.target.value })} />
              </Field>
              <Field label="Mode / Terms of payment">
                <input className={inputCls} value={data.meta.paymentTerms} onChange={(e) => set("meta", { paymentTerms: e.target.value })} />
              </Field>
              <Field label="Reference no. & date">
                <input className={inputCls} value={data.meta.reference} onChange={(e) => set("meta", { reference: e.target.value })} />
              </Field>
              <Field label="Other references">
                <input className={inputCls} value={data.meta.otherReferences} onChange={(e) => set("meta", { otherReferences: e.target.value })} />
              </Field>
              <Field label="Buyer's order no.">
                <input className={inputCls} value={data.meta.buyerOrderNo} onChange={(e) => set("meta", { buyerOrderNo: e.target.value })} />
              </Field>
              <Field label="Dispatch doc no.">
                <input className={inputCls} value={data.meta.dispatchDocNo} onChange={(e) => set("meta", { dispatchDocNo: e.target.value })} />
              </Field>
              <Field label="Dispatched through">
                <input className={inputCls} value={data.meta.dispatchedThrough} onChange={(e) => set("meta", { dispatchedThrough: e.target.value })} />
              </Field>
              <Field label="Destination">
                <input className={inputCls} value={data.meta.destination} onChange={(e) => set("meta", { destination: e.target.value })} />
              </Field>
              <Field label="Terms of delivery" className="col-span-2">
                <input className={inputCls} value={data.meta.termsOfDelivery} onChange={(e) => set("meta", { termsOfDelivery: e.target.value })} />
              </Field>
            </div>
          </Section>

          <Section title="Seller">
            <PartyForm value={data.seller} onChange={(p) => set("seller", p)} withContact />
          </Section>

          <Section title="Buyer (Bill to)">
            <PartyForm value={data.buyer} onChange={(p) => set("buyer", p)} />
          </Section>

          <Section
            title="Consignee (Ship to)"
            right={
              <label className="flex items-center gap-2 text-xs text-zinc-600">
                <input type="checkbox" checked={data.sameAsBuyer} onChange={(e) => setData((d) => ({ ...d, sameAsBuyer: e.target.checked }))} />
                Same as buyer
              </label>
            }
          >
            {data.sameAsBuyer
              ? <p className="text-xs text-zinc-500">Using buyer details for shipping.</p>
              : <PartyForm value={data.consignee} onChange={(p) => set("consignee", p)} />}
          </Section>

          <Section title="Items" right={
            <button onClick={addItem} className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100">+ Add item</button>
          }>
            <div className="flex flex-col gap-3">
              {data.items.map((it, i) => (
                <div key={it.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-500">Item {i + 1}</span>
                    <button onClick={() => removeItem(it.id)} disabled={data.items.length === 1} className="text-xs text-red-600 hover:underline disabled:opacity-30">Remove</button>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    <Field label="Description" className="col-span-4">
                      <input className={inputCls} value={it.desc} onChange={(e) => setItem(it.id, { desc: e.target.value })} />
                    </Field>
                    <Field label="HSN/SAC" className="col-span-2">
                      <input className={inputCls} value={it.hsn} onChange={(e) => setItem(it.id, { hsn: e.target.value })} />
                    </Field>
                    <Field label="Qty" className="col-span-2">
                      <input type="number" className={inputCls} value={it.qty} onChange={(e) => setItem(it.id, { qty: parseFloat(e.target.value) || 0 })} />
                    </Field>
                    <Field label="Unit" className="col-span-1">
                      <input className={inputCls} value={it.unit} onChange={(e) => setItem(it.id, { unit: e.target.value.toUpperCase() })} />
                    </Field>
                    <Field label="Rate" className="col-span-2">
                      <input type="number" step="0.01" className={inputCls} value={it.rate} onChange={(e) => setItem(it.id, { rate: parseFloat(e.target.value) || 0 })} />
                    </Field>
                    <Field label="Disc %" className="col-span-1">
                      <input type="number" className={inputCls} value={it.disc} onChange={(e) => setItem(it.id, { disc: parseFloat(e.target.value) || 0 })} />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Salesperson">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Salesperson Name">
                <input className={inputCls} value={data.salesperson?.name || ""} onChange={(e) => set("salesperson", { name: e.target.value })} />
              </Field>
              <Field label="Salesperson Contact">
                <input className={inputCls} value={data.salesperson?.contact || ""} onChange={(e) => set("salesperson", { contact: e.target.value })} />
              </Field>
            </div>
          </Section>

          <Section title="Tax & declaration">
            <div className="grid grid-cols-2 gap-3">
              <Field label="GST rate (total %)">
                <select className={inputCls} value={data.gstRate} onChange={(e) => setData((d) => ({ ...d, gstRate: parseFloat(e.target.value) }))}>
                  {[0, 5, 12, 18, 28].map((r) => (
                    <option key={r} value={r}>{r}% (CGST {r / 2}% + SGST {r / 2}%)</option>
                  ))}
                </select>
              </Field>
              <div className="flex items-end text-xs text-zinc-500">
                Grand total: <span className="ml-1 font-semibold text-zinc-900">₹ {fmt(calc.total)}</span>
              </div>
              <Field label="Declaration" className="col-span-2">
                <textarea rows={3} className={inputCls} value={data.declaration} onChange={(e) => setData((d) => ({ ...d, declaration: e.target.value }))} />
              </Field>
            </div>
          </Section>
        </div>
      </div>

      {/* RIGHT: LIVE PREVIEW */}
      <div ref={paneRef} id="preview-panel" className={`${mobileTab === 'preview' ? 'flex' : 'hidden'} md:flex flex-col h-full min-w-0 flex-1 overflow-auto bg-zinc-200 p-4`}>
        <div
          id="invoice-sheet"
          style={{ "--z": scale }}
          className="print-area mx-auto w-[210mm] max-w-none bg-white p-[8mm] text-[11px] leading-snug text-black shadow-lg [zoom:var(--z)]"
        >
          <div className="flex items-center justify-between mb-0">
            <img src={mksLogo} alt="MKS Alliance" className="h-16 object-contain" />
            <img src={volvlineLogo} alt="Volvoline" className="h-6 object-contain" />
          </div>
          <h2 className="mb-0.5 mt-[-4px] text-center text-base font-bold tracking-wide">QUOTATION</h2>
          <div className="border-2 border-black text-black">
            <div className="grid grid-cols-2">
              <div className="border-r border-black">
                <div className="border-b border-black p-2">
                  <div className="text-xs font-bold">{data.seller.name}</div>
                  <div className="whitespace-pre-line">{data.seller.address}</div>
                  <div>GSTIN/UIN: {data.seller.gstin}</div>
                  <div>State Name : {data.seller.state}, Code : {data.seller.code}</div>
                  <div>Contact : {data.seller.contact}</div>
                </div>
                <Party title="Consignee (Ship to)" p={consignee} className="border-b border-black" />
                <Party title="Buyer (Bill to)" p={data.buyer} />
              </div>
              <div className="grid grid-cols-2 auto-rows-fr">
                <Meta l="Quotation No." v={data.meta.invoiceNo} bold />
                <Meta l="Dated" v={data.meta.date} bold last />
                <Meta l="Delivery Note" v={data.meta.deliveryNote} />
                <Meta l="Mode/Terms of Payment" v={data.meta.paymentTerms} last />
                <Meta l="Reference No. & Date." v={data.meta.reference} />
                <Meta l="Other References" v={data.meta.otherReferences} last />
                <Meta l="Buyer's Order No." v={data.meta.buyerOrderNo} />
                <Meta l="Dated" v="" last />
                <Meta l="Dispatch Doc No." v={data.meta.dispatchDocNo} />
                <Meta l="Delivery Note Date" v="" last />
                <Meta l="Dispatched through" v={data.meta.dispatchedThrough} />
                <Meta l="Destination" v={data.meta.destination} last />
                <div className="col-span-2 p-1.5">
                  <div className="text-[9px] text-black">Terms of Delivery</div>
                  <div>{data.meta.termsOfDelivery}</div>
                </div>
              </div>
            </div>

            <table className="w-full border-collapse border-t border-black">
              <thead>
                <tr className="border-b border-black text-center">
                  <th className="w-8 border-r border-black p-1">Sl No.</th>
                  <th className="border-r border-black p-1 text-left">Description of Goods</th>
                  <th className="w-20 border-r border-black p-1">HSN/SAC</th>
                  <th className="w-20 border-r border-black p-1">Quantity</th>
                  <th className="w-20 border-r border-black p-1">Rate</th>
                  <th className="w-10 border-r border-black p-1">per</th>
                  <th className="w-10 border-r border-black p-1">Disc. %</th>
                  <th className="w-24 p-1">Amount</th>
                </tr>
              </thead>
              <tbody>
                {calc.lines.map((l, i) => (
                  <tr key={l.id} className="align-top">
                    <td className="border-r border-black p-1 text-center">{i + 1}</td>
                    <td className="border-r border-black p-1 font-semibold">{l.desc}</td>
                    <td className="border-r border-black p-1 text-center">{l.hsn}</td>
                    <td className="border-r border-black p-1 text-right font-semibold">{fmt(l.qty)} {l.unit}</td>
                    <td className="border-r border-black p-1 text-right">{fmt(l.rate)}</td>
                    <td className="border-r border-black p-1 text-center">{l.unit}</td>
                    <td className="border-r border-black p-1 text-center">{l.disc ? l.disc : ""}</td>
                    <td className="p-1 text-right font-semibold">{fmt(l.amount)}</td>
                  </tr>
                ))}
                <tr className="h-24">
                  <td className="border-r border-black" />
                  <td className="border-r border-black p-1 text-right italic">
                    {data.gstRate > 0 && calc.taxable > 0 && (<><div className="font-semibold">C-GST@{calc.half}%</div><div className="font-semibold">S-GST@{calc.half}%</div></>)}
                    {calc.roundOff !== 0 && <div>ROUND OFF</div>}
                  </td>
                  <td className="border-r border-black" /><td className="border-r border-black" />
                  <td className="border-r border-black" /><td className="border-r border-black" />
                  <td className="border-r border-black" />
                  <td className="p-1 text-right font-semibold align-top">
                    {data.gstRate > 0 && calc.taxable > 0 && (<><div>{fmt(calc.cgst)}</div><div>{fmt(calc.sgst)}</div></>)}
                    {calc.roundOff !== 0 && <div>{fmt(Math.abs(calc.roundOff))}</div>}
                  </td>
                </tr>
                {calc.lines.length > 0 && (
                <tr className="border-t border-black font-bold">
                  <td className="border-r border-black" />
                  <td className="border-r border-black p-1 text-right">Total</td>
                  <td className="border-r border-black" />
                  <td className="border-r border-black p-1 text-right">{fmt(calc.totalQty)} {unitLabel}</td>
                  <td className="border-r border-black" /><td className="border-r border-black" />
                  <td className="border-r border-black" />
                  <td className="p-1 text-right text-sm">₹ {fmt(calc.total)}</td>
                </tr>
                )}
              </tbody>
            </table>

            <div className="flex justify-between border-t border-black p-1.5">
              <div>
                <div className="text-[9px] text-black">Amount Chargeable (in words)</div>
                <div className="font-bold">{rupeesInWords(calc.total)}</div>
              </div>
              <div className="text-[9px] italic">E. &amp; O.E</div>
            </div>

            <table className="w-full border-collapse border-t border-black text-center">
              <thead>
                <tr className="border-b border-black">
                  <th rowSpan={2} className="border-r border-black p-1">HSN/SAC</th>
                  <th rowSpan={2} className="border-r border-black p-1">Taxable Value</th>
                  <th colSpan={2} className="border-b border-r border-black p-1">CGST</th>
                  <th colSpan={2} className="border-b border-r border-black p-1">SGST/UTGST</th>
                  <th rowSpan={2} className="p-1">Total Tax Amount</th>
                </tr>
                <tr className="border-b border-black">
                  <th className="border-r border-black p-1">Rate</th>
                  <th className="border-r border-black p-1">Amount</th>
                  <th className="border-r border-black p-1">Rate</th>
                  <th className="border-r border-black p-1">Amount</th>
                </tr>
              </thead>
              <tbody>
                {calc.hsnRows.map((r) => (
                  <tr key={r.hsn}>
                    <td className="border-r border-black p-1 text-left">{r.hsn}</td>
                    <td className="border-r border-black p-1 text-right">{fmt(r.value)}</td>
                    <td className="border-r border-black p-1">{calc.half}%</td>
                    <td className="border-r border-black p-1 text-right">{fmt(r.cgst)}</td>
                    <td className="border-r border-black p-1">{calc.half}%</td>
                    <td className="border-r border-black p-1 text-right">{fmt(r.sgst)}</td>
                    <td className="p-1 text-right">{fmt(r.tax)}</td>
                  </tr>
                ))}
                <tr className="border-t border-black font-bold">
                  <td className="border-r border-black p-1 text-right">Total</td>
                  <td className="border-r border-black p-1 text-right">{fmt(calc.taxable)}</td>
                  <td className="border-r border-black" />
                  <td className="border-r border-black p-1 text-right">{fmt(calc.cgst)}</td>
                  <td className="border-r border-black" />
                  <td className="border-r border-black p-1 text-right">{fmt(calc.sgst)}</td>
                  <td className="p-1 text-right">{fmt(calc.taxTotal)}</td>
                </tr>
              </tbody>
            </table>

            <div className="border-t border-black p-1.5">
              Tax Amount (in words) : <span className="font-bold">{rupeesInWords(calc.taxTotal)}</span>
            </div>

            <div className="grid grid-cols-2 border-t border-black">
              <div className="border-r border-black p-2">
                <div className="font-semibold underline">Declaration</div>
                <div>{data.declaration}</div>
              </div>
              <div className="flex flex-col justify-between p-2 text-right">
                <div className="font-bold">for {data.seller.name}</div>
                {data.salesperson?.name && (
                  <div className="mt-2 text-left border-t border-black pt-1">
                    <div className="text-[9px] font-bold text-black">Salesperson</div>
                    <div className="font-semibold">{data.salesperson.name}</div>
                    {data.salesperson.contact && <div>{data.salesperson.contact}</div>}
                  </div>
                )}
                <div className="mt-10">Authorised Signatory</div>
              </div>
            </div>
          </div>
          <p className="mt-1 text-center text-[9px] text-zinc-600">This is a Computer Generated Quotation</p>
        </div>
      </div>

      <style>{`
        @media print {
          #invoice-sheet { zoom: 1 !important; width: 100% !important; box-shadow: none !important; padding: 4mm !important; }
        }
      `}</style>
    </div>
  );
}

function Party({ title, p, className = "" }) {
  return (
    <div className={"p-2 " + className}>
      <div className="text-[9px] text-black">{title}</div>
      <div className="font-bold">{p.name}</div>
      <div className="whitespace-pre-line">{p.address}</div>
      <div>GSTIN/UIN : {p.gstin}</div>
      <div>State Name : {p.state}, Code : {p.code}</div>
    </div>
  );
}

function Meta({ l, v, bold, last }) {
  return (
    <div className={"border-b border-black p-1.5 " + (last ? "" : "border-r")}>
      <div className="text-[9px] font-bold text-black">{l}</div>
      <div className={"text-[10px] " + (bold ? "font-bold" : "font-normal")}>{v}</div>
    </div>
  );
}
