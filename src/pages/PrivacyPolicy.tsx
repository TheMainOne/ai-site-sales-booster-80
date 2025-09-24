import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="py-6 px-6 border-b">
        <div className="container mx-auto max-w-4xl flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Back to home
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
        </div>
      </header>

      {/* Content */}
      <main className="py-12 px-6">
        <div className="container mx-auto max-w-4xl">
          <Card className="shadow-lg">
            <CardContent className="p-8 space-y-8">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
                <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
              </div>

              <Separator />

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Introduction</h2>
                <p className="text-muted-foreground leading-relaxed">
                  AI-Consultant Widget ("we," "our," or "us") is committed to protecting your privacy. 
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
                  when you use our AI-powered website consultation widget service.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Information We Collect</h2>
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground">Personal Information</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Contact information (name, email address, phone number)</li>
                    <li>Account credentials and profile information</li>
                    <li>Communication preferences</li>
                    <li>Business information and requirements</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground">Usage Information</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Conversation data and chat interactions</li>
                    <li>Website usage patterns and analytics</li>
                    <li>Device information and browser details</li>
                    <li>IP address and location data</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">How We Use Your Information</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use the collected information to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Provide and improve our AI consultation services</li>
                  <li>Personalize user experience and recommendations</li>
                  <li>Communicate with you about our services</li>
                  <li>Analyze usage patterns to enhance functionality</li>
                  <li>Ensure security and prevent fraudulent activities</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Data Sharing and Disclosure</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We do not sell, trade, or rent your personal information to third parties. 
                  We may share your information only in the following circumstances:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>With your explicit consent</li>
                  <li>To comply with legal requirements or court orders</li>
                  <li>To protect our rights, privacy, safety, or property</li>
                  <li>With trusted service providers who assist in our operations</li>
                  <li>In connection with business transfers or mergers</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Data Security</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We implement appropriate technical and organizational measures to protect your 
                  personal information against unauthorized access, alteration, disclosure, or destruction. 
                  This includes encryption, secure servers, and regular security assessments.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Your Rights</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Depending on your location, you may have the following rights:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Access and review your personal information</li>
                  <li>Correct or update inaccurate data</li>
                  <li>Delete your personal information</li>
                  <li>Restrict or object to processing</li>
                  <li>Data portability</li>
                  <li>Withdraw consent at any time</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Cookies and Tracking</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use cookies and similar technologies to enhance your experience, analyze usage, 
                  and improve our services. You can control cookie preferences through your browser settings.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Data Retention</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We retain your personal information only as long as necessary to fulfill the purposes 
                  outlined in this policy, comply with legal obligations, resolve disputes, and enforce agreements.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Changes to This Policy</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy periodically. We will notify you of any material 
                  changes by posting the new policy on our website and updating the "Last updated" date.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about this Privacy Policy or our data practices, 
                  please contact us at:
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-foreground font-medium">AI-Consultant Widget</p>
                  <p className="text-muted-foreground">Email: privacy@ai-consultant-widget.com</p>
                  <p className="text-muted-foreground">Address: [Your Company Address]</p>
                </div>
              </section>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;