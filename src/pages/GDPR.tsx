import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Footer from "@/components/Footer";

const GDPR = () => {
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
        </div>
      </header>

      {/* Content */}
      <main className="py-12 px-6">
        <div className="container mx-auto max-w-4xl">
          <Card className="shadow-lg">
            <CardContent className="p-8 space-y-8">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-foreground">GDPR Compliance</h1>
                <p className="text-muted-foreground">General Data Protection Regulation</p>
                <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
              </div>

              <Separator />

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">What is GDPR?</h2>
                <p className="text-muted-foreground leading-relaxed">
                  The General Data Protection Regulation (GDPR) is a comprehensive data protection law 
                  that came into effect on May 25, 2018. It strengthens and unifies data protection 
                  for individuals within the European Union (EU) and addresses export of personal data outside the EU.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Your Rights Under GDPR</h2>
                <p className="text-muted-foreground leading-relaxed">
                  As a data subject under GDPR, you have the following rights regarding your personal data:
                </p>
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-foreground mb-2">Right to Information</h3>
                    <p className="text-muted-foreground">
                      You have the right to know how your personal data is being processed, 
                      including what data we collect and how we use it.
                    </p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-foreground mb-2">Right of Access</h3>
                    <p className="text-muted-foreground">
                      You can request access to the personal data we hold about you and 
                      receive a copy of this data in a commonly used electronic format.
                    </p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-foreground mb-2">Right to Rectification</h3>
                    <p className="text-muted-foreground">
                      You have the right to have inaccurate personal data corrected 
                      and incomplete data completed.
                    </p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-foreground mb-2">Right to Erasure (Right to be Forgotten)</h3>
                    <p className="text-muted-foreground">
                      You can request the deletion of your personal data when it is no longer 
                      necessary for the original purpose or when you withdraw consent.
                    </p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-foreground mb-2">Right to Restrict Processing</h3>
                    <p className="text-muted-foreground">
                      You can request the limitation of processing of your personal data 
                      in certain circumstances.
                    </p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-foreground mb-2">Right to Data Portability</h3>
                    <p className="text-muted-foreground">
                      You have the right to receive your personal data in a structured, 
                      commonly used format and transfer it to another controller.
                    </p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-foreground mb-2">Right to Object</h3>
                    <p className="text-muted-foreground">
                      You can object to the processing of your personal data for direct marketing 
                      purposes or based on legitimate interests.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">How We Protect Your Data</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We implement appropriate technical and organizational measures to ensure GDPR compliance:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Data minimization - we only collect data that is necessary</li>
                  <li>Purpose limitation - we use data only for specified, explicit purposes</li>
                  <li>Storage limitation - we retain data only as long as necessary</li>
                  <li>Security measures including encryption and access controls</li>
                  <li>Regular security assessments and updates</li>
                  <li>Staff training on data protection principles</li>
                  <li>Data breach notification procedures</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Legal Basis for Processing</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We process your personal data based on one or more of the following legal bases:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li><strong>Consent:</strong> You have given clear consent for processing</li>
                  <li><strong>Contract:</strong> Processing is necessary for contract performance</li>
                  <li><strong>Legal obligation:</strong> Processing is required by law</li>
                  <li><strong>Legitimate interests:</strong> Processing serves our legitimate business interests</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Data Transfers</h2>
                <p className="text-muted-foreground leading-relaxed">
                  When we transfer personal data outside the European Economic Area (EEA), 
                  we ensure appropriate safeguards are in place, including:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Adequacy decisions by the European Commission</li>
                  <li>Standard contractual clauses approved by the European Commission</li>
                  <li>Binding corporate rules for intra-group transfers</li>
                  <li>Certification schemes and codes of conduct</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Exercising Your Rights</h2>
                <p className="text-muted-foreground leading-relaxed">
                  To exercise any of your GDPR rights, please contact us using the information below. 
                  We will respond to your request within one month, or inform you if we need additional time.
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-foreground font-medium mb-2">Data Protection Officer</p>
                  <p className="text-muted-foreground">Email: dpo@ai-consultant-widget.com</p>
                  <p className="text-muted-foreground">Address: [Your Company Address]</p>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Supervisory Authority</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you believe we have not handled your personal data in accordance with GDPR, 
                  you have the right to lodge a complaint with your local data protection authority.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Updates to This Information</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this GDPR compliance information from time to time. 
                  Any changes will be posted on this page with an updated revision date.
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default GDPR;