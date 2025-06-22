import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | OTAAnswers",
  description: "Learn how OTAAnswers handles your data, respects your privacy, and protects your information in compliance with GDPR and best practices.",
};

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="prose prose-lg max-w-none">
        <h1>Privacy Policy</h1>
        <p><strong>Effective date:</strong> June 22, 2025</p>

        <p>At OTAAnswers, operated by Bobook Limited, your privacy is extremely important to us. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our website and tools at <a href="https://otaanswers.com" className="text-indigo-600 hover:text-indigo-500">https://otaanswers.com</a>.</p>

        <h2>1. Who We Are</h2>
        <p>Bobook Limited is a company registered in Ireland with the following details:</p>
        <ul>
          <li><strong>Company Name:</strong> Bobook Limited</li>
          <li><strong>Company Number:</strong> 785764</li>
          <li><strong>Address:</strong> Venture Hub, 136 Capel Street, Dublin 1, Dublin, D01 T2C9, Ireland</li>
          <li><strong>Contact Email:</strong> <a href="mailto:info@otaanswers.com" className="text-indigo-600 hover:text-indigo-500">info@otaanswers.com</a></li>
          <li><strong>Phone:</strong> +353 870385414</li>
        </ul>

        <h2>2. Data We Collect</h2>
        <ul>
          <li><strong>Contact Information:</strong> such as your email address when you reach out to us.</li>
          <li><strong>Usage Data:</strong> including IP address, browser type, pages visited, and actions on our site.</li>
          <li><strong>Cookies and Tracking Technologies:</strong> used to enhance user experience and monitor traffic.</li>
        </ul>

        <h2>3. Purpose of Data Use</h2>
        <p>We collect and use your data to:</p>
        <ul>
          <li>Provide and maintain our services</li>
          <li>Improve and personalize the user experience</li>
          <li>Respond to inquiries and provide customer support</li>
          <li>Analyze how our tools are used to optimize functionality</li>
          <li>Send relevant updates or promotional materials (only with your consent)</li>
        </ul>

        <h2>4. Data Sharing and Security</h2>
        <p>We do not sell or rent your personal data. We may use trusted third-party services (like analytics or hosting providers) who are GDPR-compliant. We implement technical and organizational security measures to protect your data, but no method of transmission over the Internet is 100% secure.</p>

        <h2>5. Your Rights (GDPR)</h2>
        <p>If you are located in the EU or EEA, you have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Request correction or deletion</li>
          <li>Object to or restrict data processing</li>
          <li>Withdraw consent where applicable</li>
        </ul>
        <p>To exercise your rights, please contact us at <a href="mailto:info@otaanswers.com" className="text-indigo-600 hover:text-indigo-500">info@otaanswers.com</a>.</p>

        <h2>6. Cookies and Analytics</h2>
        <p>We use cookies and tracking technologies to enhance user experience and monitor traffic. Specifically, we use:</p>
        <ul>
          <li><strong>Google Analytics:</strong> We use Google Analytics (GA4) to understand how visitors interact with our website. Google Analytics may collect information such as your IP address, browser type, pages visited, and time spent on pages. This data helps us improve our services and user experience.</li>
          <li><strong>Essential Cookies:</strong> These are necessary for the website to function properly and cannot be disabled.</li>
        </ul>
        <p>You can control or disable cookies through your browser settings. To opt out of Google Analytics tracking, you can install the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">Google Analytics Opt-out Browser Add-on</a>.</p>

        <h2>7. Updates to This Policy</h2>
        <p>This Privacy Policy may be updated from time to time. We encourage you to review it periodically. Any changes will be posted on this page with an updated effective date.</p>

        <h2>8. Contact</h2>
        <p>If you have any questions about this Privacy Policy, contact us at:</p>
        <div className="bg-gray-50 p-6 rounded-lg">
          <p className="mb-0">
            <strong>Bobook Limited</strong><br />
            Venture Hub, 136 Capel Street, Dublin 1, Dublin, D01 T2C9, Ireland<br />
            Company Number: 785764<br />
            Email: <a href="mailto:info@otaanswers.com" className="text-indigo-600 hover:text-indigo-500">info@otaanswers.com</a><br />
            Phone: +353 870385414
          </p>
        </div>
      </div>
    </div>
  );
} 