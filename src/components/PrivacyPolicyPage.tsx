import { Shield, Lock, Eye, FileText } from 'lucide-react';

export function PrivacyPolicyPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8 md:py-12">
      <div className="bg-white rounded-lg shadow-sm p-6 md:p-10">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-[#003366]" />
          <h1 className="text-[#003366]">Privacy Policy</h1>
        </div>

        <p className="text-gray-600 mb-8">
          <strong>Effective Date:</strong> July 17, 2026<br />
          <strong>Last Updated:</strong> July 17, 2026
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-[#003366] mb-4">1. Introduction</h2>
            <p className="text-gray-700 leading-relaxed">
              Source Sevens ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services. Please read it carefully to understand our data practices.
            </p>
          </section>

          <section>
            <h2 className="text-[#003366] mb-4">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-[#003366] mb-2">2.1 Personal Information</h3>
                <p className="text-gray-700 mb-2">We may collect the following personal information:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Name, email address, phone number</li>
                  <li>Shipping and billing addresses</li>
                  <li>Payment information (processed securely through third-party payment processors)</li>
                  <li>Order history and purchase preferences</li>
                  <li>Account credentials (username and encrypted password)</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-[#003366] mb-2">2.2 Automatically Collected Information</h3>
                <p className="text-gray-700 mb-2">When you visit our website, we automatically collect:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>IP address and browser type</li>
                  <li>Device information and operating system</li>
                  <li>Pages viewed and time spent on our site</li>
                  <li>Referring website addresses</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-[#003366] mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 mb-2">We use your information for the following purposes:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Process and fulfill your orders</li>
              <li>Communicate with you about your orders and account</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Send promotional emails and updates (with your consent)</li>
              <li>Improve our website, products, and services</li>
              <li>Prevent fraud and enhance security</li>
              <li>Comply with legal obligations and enforce our terms</li>
              <li>Analyze usage patterns and optimize user experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[#003366] mb-4">4. Information Sharing and Disclosure</h2>
            <p className="text-gray-700 mb-2">We do not sell your personal information. We may share your information with:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li><strong>Service Providers:</strong> Third-party vendors who assist with payment processing, shipping, email delivery, and website hosting</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or government regulation</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of company assets</li>
              <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[#003366] mb-4">5. Data Security</h2>
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <Lock className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-gray-700">
                We implement industry-standard security measures to protect your personal information, including SSL encryption, secure servers, and regular security audits. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-[#003366] mb-4">6. Cookies and Tracking Technologies</h2>
            <p className="text-gray-700 mb-2">
              We use cookies and similar technologies to enhance your browsing experience, analyze site traffic, and personalize content. You can control cookie preferences through your browser settings. Types of cookies we use:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li><strong>Essential Cookies:</strong> Required for website functionality</li>
              <li><strong>Performance Cookies:</strong> Help us understand how visitors use our site</li>
              <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
              <li><strong>Marketing Cookies:</strong> Track your activity for advertising purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[#003366] mb-4">7. Your Rights and Choices</h2>
            <p className="text-gray-700 mb-2">You have the following rights regarding your personal information:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data (subject to legal requirements)</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing emails at any time</li>
              <li><strong>Data Portability:</strong> Request transfer of your data to another service</li>
              <li><strong>Object:</strong> Object to processing of your personal information</li>
            </ul>
            <p className="text-gray-700 mt-4">
              To exercise these rights, please contact us at Sevensjamaica@gmail.com
            </p>
          </section>

          <section>
            <h2 className="text-[#003366] mb-4">8. Children's Privacy</h2>
            <p className="text-gray-700">
              Our website is not intended for children under 18 years of age. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child without parental consent, we will take steps to delete that information promptly.
            </p>
          </section>

          <section>
            <h2 className="text-[#003366] mb-4">9. International Data Transfers</h2>
            <p className="text-gray-700">
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy and applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-[#003366] mb-4">10. Third-Party Links</h2>
            <p className="text-gray-700">
              Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies before providing any personal information.
            </p>
          </section>

          <section>
            <h2 className="text-[#003366] mb-4">11. Data Retention</h2>
            <p className="text-gray-700">
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, comply with legal obligations, resolve disputes, and enforce our agreements. When data is no longer needed, we securely delete or anonymize it.
            </p>
          </section>

          <section>
            <h2 className="text-[#003366] mb-4">12. Changes to This Privacy Policy</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of any material changes by posting the updated policy on our website and updating the "Last Updated" date. Your continued use of our services after such changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-[#003366] mb-4">13. Contact Us</h2>
            <div className="bg-gray-50 rounded-lg p-6 space-y-2">
              <p className="text-gray-700">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
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
            <p className="text-sm text-gray-500 text-center">
              By using our website and services, you acknowledge that you have read and understood this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
