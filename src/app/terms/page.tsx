import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | OTAAnswers",
  description: "Read the legal agreement governing your use of OTAAnswers tools and services. Transparent, clear, and GDPR-compliant.",
};

export default function TermsAndConditions() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="prose prose-lg max-w-none">
        <h1>Terms and Conditions</h1>
        <p><strong>Effective date:</strong> June 22, 2025</p>

        <p>Welcome to OTAAnswers. By accessing or using this website, you agree to comply with and be bound by the following Terms and Conditions. If you do not agree with any part of these terms, please do not use our service.</p>

        <h2>1. Who We Are</h2>
        <p>This website is operated by Bobook Limited, a company registered in Ireland:</p>
        <ul>
          <li><strong>Company Name:</strong> Bobook Limited</li>
          <li><strong>Company Number:</strong> 785764</li>
          <li><strong>Registered Address:</strong> Venture Hub, 136 Capel Street, Dublin 1, Dublin, D01 T2C9, Ireland</li>
        </ul>

        <h2>2. Use of the Site</h2>
        <p>You agree to use this website only for lawful purposes and in a way that does not infringe on the rights or restrict the use of the site by any other person or organization.</p>

        <h2>3. Intellectual Property</h2>
        <p>All materials on this site, including text, code, tools, graphics, logos, and software, are the intellectual property of Bobook Limited or its content providers. You may not copy, reproduce, or distribute any part without written permission.</p>

        <h2>4. Disclaimer of Liability</h2>
        <p>All tools and content on OTAAnswers are provided "as-is" for informational and educational purposes only. We do not warrant that the content is accurate, reliable, or up to date. You use the site at your own risk.</p>

        <h2>5. External Links</h2>
        <p>This site may include links to third-party websites. We are not responsible for the content, accuracy, or availability of those external sites.</p>

        <h2>6. Termination</h2>
        <p>We reserve the right to suspend or terminate access to our services if we believe these terms are violated, without prior notice.</p>

        <h2>7. Governing Law</h2>
        <p>These terms are governed by the laws of Ireland. Any legal proceedings related to this agreement shall be handled in the courts of Ireland.</p>

        <h2>8. Changes to These Terms</h2>
        <p>We may update these terms periodically. Your continued use of the site after changes have been made constitutes acceptance of the updated terms.</p>

        <h2>9. Contact</h2>
        <p>For any questions regarding these Terms, please contact us at:</p>
        <div className="bg-gray-50 p-6 rounded-lg">
          <p className="mb-0">
            <strong>Bobook Limited</strong><br />
            Venture Hub, 136 Capel Street, Dublin 1, Dublin, D01 T2C9, Ireland<br />
            Email: <a href="mailto:info@otaanswers.com" className="text-indigo-600 hover:text-indigo-500">info@otaanswers.com</a><br />
            Phone: +353 870385414
          </p>
        </div>
      </div>
    </div>
  );
} 