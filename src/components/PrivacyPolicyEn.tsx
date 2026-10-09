import React from 'react';
import { ArrowLeft, Shield, Eye, Lock, Users, FileText, Mail, Calendar, Package } from 'lucide-react';
import { Button } from './ui/Button';
import { LanguageSwitch } from '../i18n/locale';

interface PrivacyPolicyEnProps {
  onBack: () => void;
}

export const PrivacyPolicyEn: React.FC<PrivacyPolicyEnProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              Back
            </button>
            <LanguageSwitch tone="light" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield size={40} className="text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Privacy policy
            </h1>
            <p className="text-xl text-gray-600">
              TuniDrive.net
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {new Date().toLocaleDateString('en-GB')}
            </p>
          </div>

          <div className="prose max-w-none">
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              This privacy policy describes how TuniDrive.net collects, uses, stores and protects your personal data
              when you use our platform to book private-hire trips, submit quote requests for the international transport
              of parcels and goods (Europe ↔ Tunisia), or offer your services as a partner driver or carrier.
            </p>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Eye size={24} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">1. Data we collect</h2>
              </div>

              <p className="text-gray-700 mb-4">
                When you use our website or app, we may collect the following information:
              </p>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Account information:</h4>
                  <p className="text-gray-700">first name, last name, email address, phone number, password.</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Private-hire booking information:</h4>
                  <p className="text-gray-700">pickup and drop-off addresses, date, time, trip details.</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Parcel quote requests:</h4>
                  <p className="text-gray-700">
                    trip direction (Europe → Tunisia or the reverse), addresses, preferred date, description of the items
                    (name, quantity, weight, volume), notes, photos and attached documents (invoices, supporting documents),
                    carriers&apos; price offers and the status of the request.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Driver / carrier profile:</h4>
                  <p className="text-gray-700">
                    activity type (passenger transport, parcel transport, or both), availability,
                    vehicles, city, licence and professional information provided at signup or in the profile.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Payment information (where applicable):</h4>
                  <p className="text-gray-700">billing details (we do not store sensitive bank data ourselves; it is processed by our secure payment provider).</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Location data:</h4>
                  <p className="text-gray-700">only when you allow your position to be shared, so we can help connect you with a driver.</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Technical data:</h4>
                  <p className="text-gray-700">IP address, browser type, device used, session cookies and user preferences.</p>
                </div>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText size={24} className="text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">2. Why we use the data</h2>
              </div>

              <p className="text-gray-700 mb-4">
                Your data is collected and used in order to:
              </p>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Create and manage your user account.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Connect customers with partner drivers and carriers.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Manage parcel quote requests, match them to availability and compare offers.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Follow private-hire bookings and keep a history of transport requests.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Allow contact details to be exchanged between the customer and the carrier after a quote is accepted.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Improve the quality of our services and personalise the user experience.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Communicate with you (booking notifications, emails, SMS).</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Meet our legal obligations and prevent fraud or misuse.</span>
                </li>
              </ul>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Users size={24} className="text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">3. Sharing data</h2>
              </div>

              <p className="text-gray-700 mb-4">
                We share your personal data only with:
              </p>

              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2">Partner drivers and carriers:</h4>
                  <p className="text-orange-800">
                    only the data needed for the service: for a private-hire trip (name, phone, addresses);
                    for a parcel quote (details of the request, and contact details after the customer accepts the quote).
                  </p>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2">Technical providers:</h4>
                  <p className="text-orange-800">hosting, email/SMS delivery, secure payment.</p>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2">Competent authorities:</h4>
                  <p className="text-orange-800">only when required by law or by a court.</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                <p className="text-red-800 font-semibold">
                  We never sell your personal data to third parties.
                </p>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar size={24} className="text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">4. How long we keep data</h2>
              </div>

              <div className="space-y-4">
                <p className="text-gray-700">
                  Your data is kept for as long as needed to provide the service and manage your account.
                </p>

                <p className="text-gray-700">
                  Some data (billing, booking history, parcel quote requests and offers, attachments)
                  may be kept in line with legal obligations and to handle any disputes.
                </p>
                <p className="text-gray-700">
                  Photos and documents related to parcels are stored on our secure servers and are accessible only
                  to authorised people (the customer concerned, the carriers who were asked, TuniDrive administration).
                </p>

                <p className="text-gray-700">
                  You can ask for your account and your data to be deleted at any time (see section 7).
                </p>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Lock size={24} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">5. Security</h2>
              </div>

              <p className="text-gray-700 mb-4">
                We put in place the technical and organisational measures needed to protect your data against unauthorised access, loss or disclosure:
              </p>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <Lock size={32} className="text-green-600 mx-auto mb-2" />
                  <h4 className="font-semibold text-green-900 mb-1">Encryption</h4>
                  <p className="text-sm text-green-800">SSL/TLS communications</p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <Shield size={32} className="text-green-600 mx-auto mb-2" />
                  <h4 className="font-semibold text-green-900 mb-1">Secure storage</h4>
                  <p className="text-sm text-green-800">Servers in Tunisia/EU</p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <Users size={32} className="text-green-600 mx-auto mb-2" />
                  <h4 className="font-semibold text-green-900 mb-1">Restricted access</h4>
                  <p className="text-sm text-green-800">Authorised staff only</p>
                </div>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Eye size={24} className="text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">6. Cookies</h2>
              </div>

              <p className="text-gray-700 mb-4">
                Our website uses cookies in order to:
              </p>

              <ul className="space-y-2 mb-4">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Make browsing and sign-in easier.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Remember your preferences.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Analyse how the site is used so we can improve our services.</span>
                </li>
              </ul>

              <p className="text-gray-700">
                You can set your browser to refuse or limit cookies.
                Some features may then not work properly.
              </p>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Shield size={24} className="text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">7. Your rights</h2>
              </div>

              <p className="text-gray-700 mb-4">
                Under Tunisian law no. 2004-63 on the protection of personal data, you have the following rights:
              </p>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h4 className="font-semibold text-indigo-900 mb-2">Access</h4>
                  <p className="text-indigo-800 text-sm">know which data is collected.</p>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h4 className="font-semibold text-indigo-900 mb-2">Correction</h4>
                  <p className="text-indigo-800 text-sm">correct information that is inaccurate.</p>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h4 className="font-semibold text-indigo-900 mb-2">Deletion</h4>
                  <p className="text-indigo-800 text-sm">ask for your personal data to be deleted.</p>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h4 className="font-semibold text-indigo-900 mb-2">Objection</h4>
                  <p className="text-indigo-800 text-sm">refuse certain processing (for example marketing).</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800">
                  <strong>To exercise your rights, contact us at:</strong> support@tunidrive.net
                </p>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Package size={24} className="text-gray-700" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">8. Data related to parcel transport</h2>
              </div>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">
                    When you submit a request, you are informed that carriers matching your date and your route
                    may see the information and attachments needed to prepare a quote.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">
                    We recommend that you do not attach documents that contain sensitive data which is not needed for the transport.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">
                    Email notifications (new request, offer, acceptance) may contain a summary of the request
                    without including all of the attachments.
                  </span>
                </li>
              </ul>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileText size={24} className="text-gray-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">9. Changes to this policy</h2>
              </div>

              <div className="space-y-4">
                <p className="text-gray-700">
                  We may update this privacy policy at any time.
                </p>
                <p className="text-gray-700">
                  The current version will always be available on our website.
                </p>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Mail size={24} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">10. Contact</h2>
              </div>

              <p className="text-gray-700 mb-4">
                For any question or request about your personal data, you can write to us at:
              </p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <Mail size={32} className="text-green-600 mx-auto mb-3" />
                <p className="text-xl font-semibold text-green-900">
                  support@tunidrive.net
                </p>
              </div>
            </div>
          </div>

          <div className="text-center pt-8 border-t border-gray-200">
            <Button onClick={onBack} className="bg-black hover:bg-gray-800">
              Back to home
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};
