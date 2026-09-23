import { FileText, ShoppingCart, ShieldCheck, Scale } from 'lucide-react';

export function TermsConditionsPage() {
  return (
    <main className="max-w-[1200px] mx-auto px-4 py-8 md:py-12">
      <div className="bg-white rounded-lg shadow-sm p-6 md:p-10">
        <div className="flex items-center gap-3 mb-6"><FileText className="h-8 w-8 text-[#003366]" /><h1 className="text-[#003366]">Terms & Conditions</h1></div>
        <p className="text-gray-600 mb-8"><strong>Last updated:</strong> July 17, 2026</p>
        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section><h2 className="text-[#003366] mb-3">1. Using the Source Sevens website</h2><p>These terms apply when you browse the Source Sevens website, create an account, request product sourcing or place an order. By using the site, you agree to use it lawfully and provide accurate information when making an enquiry or purchase.</p></section>
          <section><h2 className="text-[#003366] mb-3">2. Product information and quotations</h2><p>Product images, specifications, availability and pricing are provided for general guidance and may change. Items must be selected against your actual requirements before ordering. A quotation or order confirmation is the final confirmation of product, price and availability.</p></section>
          <section><h2 className="text-[#003366] mb-3">3. Orders, payment and fulfilment</h2><div className="grid md:grid-cols-3 gap-4"><div className="bg-blue-50 rounded-lg p-4"><ShoppingCart className="h-5 w-5 text-[#003366] mb-2" /><h3 className="text-[#003366] mb-2">Orders</h3><p className="text-sm">We may need to verify fitment, availability or shipping details before accepting an order.</p></div><div className="bg-blue-50 rounded-lg p-4"><ShieldCheck className="h-5 w-5 text-[#003366] mb-2" /><h3 className="text-[#003366] mb-2">Payment</h3><p className="text-sm">Payment is processed through the available checkout method. Orders are subject to confirmation.</p></div><div className="bg-blue-50 rounded-lg p-4"><Scale className="h-5 w-5 text-[#003366] mb-2" /><h3 className="text-[#003366] mb-2">Shipping</h3><p className="text-sm">Delivery timing and charges depend on the destination, shipping method and stock status.</p></div></div></section>
          <section><h2 className="text-[#003366] mb-3">4. Returns and suitability</h2><p>Please review the Return Policy before purchasing. Installed, modified, contaminated, custom-sourced or special-order items may not be eligible for return. Source Sevens is not responsible for loss or damage arising from selecting an item that is not suitable for your intended use.</p></section>
          <section><h2 className="text-[#003366] mb-3">5. Intellectual property and external links</h2><p>Site content, branding and layouts are owned by Source Sevens or used with permission. Links to external suppliers and resources are provided for convenience; their content and policies are controlled by those third parties.</p></section>
          <section><h2 className="text-[#003366] mb-3">6. Contact and updates</h2><p>We may update these terms by posting a revised version on this page. For questions, contact Source Sevens at <a className="text-[#0055AA] hover:underline" href="mailto:Sevensjamaica@gmail.com">Sevensjamaica@gmail.com</a> or visit us in Kingston, Jamaica.</p></section>
          <p className="text-sm text-gray-500 border-t pt-6">This page is general website copy and should be reviewed by qualified legal counsel before production use.</p>
        </div>
      </div>
    </main>
  );
}
