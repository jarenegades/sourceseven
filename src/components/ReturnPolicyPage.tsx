import { Package, Calendar, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export function ReturnPolicyPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8 md:py-12">
      <div className="bg-white rounded-lg shadow-sm p-6 md:p-10">
        <div className="flex items-center gap-3 mb-6">
          <Package className="h-8 w-8 text-[#003366]" />
          <h1 className="text-[#003366]">Return Policy</h1>
        </div>

        <p className="text-gray-600 mb-8">
          <strong>Effective Date:</strong> January 1, 2024<br />
          <strong>Last Updated:</strong> October 18, 2025
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-[#003366] mb-4">Return Eligibility</h2>
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <Calendar className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-gray-700">
                <strong>Items should be returned within 30 days from delivery date, provided they are in the same condition they were received and not expired.</strong>
              </p>
            </div>
            <p className="text-gray-700 mb-2">
              At Source Sevens, we are committed to your satisfaction. We understand that sometimes products may not meet your expectations, and we want to make the return process as simple as possible.
            </p>
          </section>

          <section>
            <h2 className="text-[#003366] mb-4">Return Requirements</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-[#003366] mb-2">Acceptable Returns</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>Products must be in their original, unopened packaging</li>
                    <li>Items must be unused and in the same condition as received</li>
                    <li>All original tags, labels, and documentation must be included</li>
                    <li>Product must not be expired or within 6 months of expiration date</li>
                    <li>Return request must be initiated within 30 days of delivery</li>
                    <li>Items must be accompanied by proof of purchase (receipt or order number)</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-[#003366] mb-2">Non-Returnable Items</h3>
                  <p className="text-gray-700 mb-2">To protect quality and traceability, the following items cannot be returned:</p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                    <li>Installed, damaged or modified components</li>
                    <li>Seals or lubricated products with broken packaging</li>
                    <li>Components exposed to contamination, moisture or excessive handling</li>
                    <li>Custom-sourced or special-order components</li>
                    <li>Products outside their stated return window</li>
                    <li>Items marked as "Final Sale" or "Clearance"</li>
                    <li>Custom or personalized items</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[#003366] mb-4">How to Return an Item</h2>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="bg-gradient-to-br from-blue-50 to-red-50 rounded-lg p-4">
                <div className="bg-[#DC143C] w-10 h-10 rounded-full flex items-center justify-center mb-3 text-white">
                  1
                </div>
                <h3 className="text-[#003366] mb-2">Contact Us</h3>
                <p className="text-sm text-gray-700">
                  Email us at Sevensjamaica@gmail.com or call (876) 577-6682 to initiate your return request.
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-red-50 rounded-lg p-4">
                <div className="bg-[#003366] w-10 h-10 rounded-full flex items-center justify-center mb-3 text-white">
                  2
                </div>
                <h3 className="text-[#003366] mb-2">Get Authorization</h3>
                <p className="text-sm text-gray-700">
                  Our team will review your request and provide a Return Authorization Number (RAN) if approved.
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-red-50 rounded-lg p-4">
                <div className="bg-[#FF9900] w-10 h-10 rounded-full flex items-center justify-center mb-3 text-white">
                  3
                </div>
                <h3 className="text-[#003366] mb-2">Ship It Back</h3>
                <p className="text-sm text-gray-700">
                  Package the item securely with your RAN and ship it to the address provided by our team.
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              <strong>Important:</strong> Please do not return items without first obtaining a Return Authorization Number. Unauthorized returns may not be processed.
            </p>
          </section>

          <section>
            <h2 className="text-[#003366] mb-4">Refund Process</h2>
            <div className="space-y-4">
              <p className="text-gray-700">
                Once we receive your returned item, our team will inspect it to ensure it meets our return requirements.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-[#003366] mb-3">Refund Timeline</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <RefreshCw className="h-5 w-5 text-[#003366] mt-0.5 shrink-0" />
                    <span><strong>Inspection:</strong> 2-3 business days after receipt</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <RefreshCw className="h-5 w-5 text-[#003366] mt-0.5 shrink-0" />
                    <span><strong>Refund Processing:</strong> 5-7 business days after approval</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <RefreshCw className="h-5 w-5 text-[#003366] mt-0.5 shrink-0" />
                    <span><strong>Credit Card/Bank Posting:</strong> 3-5 business days depending on your financial institution</span>
                  </li>
                </ul>
              </div>

              <p className="text-gray-700">
                Refunds will be issued to the original payment method used for the purchase. Shipping costs are non-refundable unless the return is due to our error or a defective product.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-[#003366] mb-4">Exchanges</h2>
            <p className="text-gray-700 mb-2">
              We currently do not offer direct exchanges. If you need a different product, please return the original item for a refund and place a new order for the desired item.
            </p>
          </section>

          <section>
            <h2 className="text-[#003366] mb-4">Damaged or Defective Items</h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-gray-700 mb-2">
                If you receive a damaged or defective product, please contact us immediately at Sevensjamaica@gmail.com with:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Your order number</li>
                <li>Photos of the damaged or defective item</li>
                <li>A description of the issue</li>
              </ul>
              <p className="text-gray-700 mt-3">
                We will work quickly to resolve the issue by sending a replacement or issuing a full refund, including shipping costs.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-[#003366] mb-4">Return Shipping</h2>
            <p className="text-gray-700 mb-2">
              Return shipping costs are the responsibility of the customer unless:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>The item is defective or damaged</li>
              <li>We shipped the wrong item</li>
              <li>The product does not match the description on our website</li>
            </ul>
            <p className="text-gray-700 mt-3">
              We recommend using a trackable shipping method and purchasing shipping insurance for valuable items. Source Sevens is not responsible for items lost or damaged during return transit.
            </p>
          </section>

          <section>
            <h2 className="text-[#003366] mb-4">International Returns</h2>
            <p className="text-gray-700">
              International customers are responsible for all return shipping costs and any customs fees or duties. Returns from international locations may take longer to process. Please contact our customer service team for specific instructions on international returns.
            </p>
          </section>

          <section>
            <h2 className="text-[#003366] mb-4">Contact Us About Returns</h2>
            <div className="bg-gray-50 rounded-lg p-6 space-y-2">
              <p className="text-gray-700">
                If you have questions about our return policy or need assistance with a return, please contact us:
              </p>
              <div className="text-gray-700 space-y-1">
                <p><strong>Source Sevens</strong></p>
                <p>Email: Sevensjamaica@gmail.com</p>
                <p>Phone: (876) 577-6682</p>
                <p>Address: Kingston, Jamaica</p>
              </div>
            </div>
          </section>

          <div className="border-t border-gray-200 pt-6 mt-8">
            <p className="text-sm text-gray-500">
              <strong>Note:</strong> Source Sevens reserves the right to refuse returns that do not meet our return policy requirements. We also reserve the right to update this policy at any time. Any changes will be posted on our website with an updated "Last Updated" date.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
