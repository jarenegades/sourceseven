import { ArrowRight, BookOpen, CheckCircle2 } from 'lucide-react';

const articles = [
  {
    title: 'What Does a Bearing Do? A Practical Guide for Equipment Buyers',
    answer: 'A bearing supports moving parts, reduces friction and helps machinery rotate or move smoothly under load.',
    copy: 'In a motor, pump, conveyor, gearbox or wheel hub, the correct bearing carries radial, axial or combined loads while helping protect accuracy and uptime. Choosing the right type starts with the application—not just a part number.',
    points: ['Share the shaft diameter, housing dimensions and any existing part number.', 'Confirm whether the application has radial load, axial load or both.', 'Consider speed, contamination, heat, moisture and lubrication before selecting a seal or material.'],
    search: 'industrial bearing supplier, replacement bearing, bearing selection guide',
  },
  {
    title: 'How to Identify the Right Replacement Bearing Before You Order',
    answer: 'The fastest way to identify a replacement bearing is to match its marking, dimensions, type, sealing and fitment requirements.',
    copy: 'A bearing that looks similar may have a different clearance, seal, internal geometry or load rating. For a confident replacement quote, capture the marking on the ring, measure the bore, outside diameter and width, then note the equipment and operating conditions.',
    points: ['Photograph the bearing marking and the equipment nameplate.', 'Measure bore, outside diameter and width in millimetres or inches.', 'Tell us the machine type and whether the bearing is mounted, linear, roller or thrust.'],
    search: 'bearing part number lookup, replacement roller bearing, pillow block bearing supplier',
  },
  {
    title: 'Bearing Brands and Applications: What Industrial Buyers Should Compare',
    answer: 'Industrial buyers compare bearing brands by fitment, load and speed requirements, sealing, availability, technical documentation and total cost of ownership.',
    copy: 'Leading bearing manufacturers serve applications across industrial machinery, automation, power transmission, transport and heavy-duty equipment. The right choice is the component that meets the specification and is supported by clear technical information and a dependable supply path.',
    points: ['Match the product family to the application before comparing price.', 'Request documentation for critical equipment, high speeds or demanding environments.', 'Use the exact manufacturer part number when continuity or interchangeability matters.'],
    search: 'SKF bearing supplier, Timken bearing supplier, industrial bearing brands, bearing quote',
  },
];

export function BlogPage() {
  return (
    <main className="max-w-[1200px] mx-auto px-4 py-6 md:py-12">
      <section className="bg-gradient-to-r from-[#003366] to-[#0055AA] text-white rounded-lg shadow-lg p-6 md:p-12 mb-8">
        <div className="max-w-3xl">
          <p className="uppercase tracking-[0.18em] text-sm text-blue-100 mb-3">Source Sevens Knowledge Hub</p>
          <h1 className="mb-4">Bearing Guides for Smarter Purchasing</h1>
          <p className="text-lg text-blue-100 leading-relaxed">Clear answers for maintenance teams, OEM buyers and anyone sourcing industrial bearings, mounted units and linear motion components.</p>
        </div>
      </section>

      <section aria-label="Bearing buying guides" className="grid gap-6">
        {articles.map((article, index) => (
          <article key={article.title} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="shrink-0 bg-blue-50 text-[#003366] rounded-full w-11 h-11 flex items-center justify-center"><BookOpen className="h-5 w-5" /></div>
              <div>
                <p className="text-sm font-semibold text-[#DC143C] mb-2">Buyer Guide {index + 1}</p>
                <h2 className="text-[#003366] mb-3">{article.title}</h2>
                <div className="bg-blue-50 border-l-4 border-[#FF9900] px-4 py-3 rounded-r-md mb-4">
                  <p className="font-semibold text-[#003366]">Quick answer: <span className="font-normal text-gray-700">{article.answer}</span></p>
                </div>
                <p className="text-gray-700 leading-relaxed mb-4">{article.copy}</p>
                <h3 className="text-[#003366] text-base mb-2">Before you request a quote</h3>
                <ul className="space-y-2 text-gray-700">
                  {article.points.map((point) => <li key={point} className="flex gap-2"><CheckCircle2 className="h-5 w-5 text-[#007600] shrink-0" />{point}</li>)}
                </ul>
                <p className="mt-5 text-sm text-gray-500"><span className="font-semibold">Useful search terms:</span> {article.search}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-8 bg-[#003366] text-white rounded-lg p-6 md:p-8 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
        <div><h2 className="mb-2">Need help matching a bearing?</h2><p className="text-blue-100">Send Source Sevens the marking, dimensions and equipment details for a focused sourcing conversation.</p></div>
        <a href="/contact" className="inline-flex items-center gap-2 bg-[#FF9900] hover:bg-[#F08000] text-[#131921] font-semibold px-5 py-3 rounded-md transition-colors">Request support <ArrowRight className="h-4 w-4" /></a>
      </section>
    </main>
  );
}
