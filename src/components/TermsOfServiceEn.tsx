import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Users, FileText, Mail, Calendar, Car, CreditCard, AlertTriangle, Scale, Package } from 'lucide-react';
import { Button } from './ui/Button';
import { LanguageSwitch, useLocale } from '../i18n/locale';

interface TermsOfServiceEnProps {
  onBack: () => void;
}

export const TermsOfServiceEn: React.FC<TermsOfServiceEnProps> = ({ onBack }) => {
  const { href } = useLocale();

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
              <FileText size={40} className="text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Terms of use
            </h1>
            <p className="text-xl text-gray-600">
              TuniDrive.net
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {new Date().toLocaleDateString('en-GB')}
            </p>
          </div>

          <div className="prose max-w-none">
            <p className="text-lg text-gray-700 mb-4 leading-relaxed">
              Welcome to TuniDrive.net, an online platform that connects customers with partner professionals for:
            </p>
            <ul className="text-lg text-gray-700 mb-4 list-disc pl-6 space-y-1">
              <li>booking trips in a vehicle with a driver (private hire);</li>
              <li>requesting and proposing quotes for the international transport of parcels and goods between Europe and Tunisia.</li>
            </ul>
            <p className="text-lg text-gray-700 mb-4 leading-relaxed">
              TuniDrive is not a carrier. It does not operate a public passenger-transport service within the meaning of
              Tunisian law no. 2004-33 of 19 April 2004 on the organisation of land transport, and it does not carry goods
              in its own name. It acts only as a technical intermediary that introduces the parties.
            </p>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              By using our website, our app or our services, you accept these terms of use.
            </p>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText size={24} className="text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">1. Purpose</h2>
              </div>

              <p className="text-gray-700 mb-4">
                These terms define the rules for using the TuniDrive.net platform by:
              </p>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Customers:</h4>
                  <p className="text-blue-800">
                    anyone who books a private-hire trip or submits a parcel-transport quote request through the website or the app.
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">Partner drivers and carriers:</h4>
                  <p className="text-green-800">
                    independent professionals registered on the platform according to their activity:
                    passenger transport (private hire), international parcel transport, or both. They offer their
                    services and prices independently.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users size={24} className="text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">2. Creating an account</h2>
              </div>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Signup is free for customers.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">
                    When signing up, the professional chooses an activity type (passenger transport or parcel transport).
                    That choice can later be changed from the profile.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">For drivers and carriers, signup may be subject to a subscription fee or to specific conditions (stated at registration).</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">The user agrees to provide information that is accurate, up to date and complete.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Each user is responsible for keeping their login details confidential and for any activity carried out from their account.</span>
                </li>
              </ul>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Car size={24} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">3. Using the service</h2>
              </div>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Customers can search for, book and follow a trip through the platform.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Drivers receive booking requests and may accept or decline them.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">A booking confirmation is sent to both parties (customer and driver) by email and/or SMS.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Trips must be carried out in compliance with Tunisian and international transport rules.</span>
                </li>
              </ul>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Package size={24} className="text-gray-700" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">4. International transport of parcels and goods</h2>
              </div>

              <p className="text-gray-700 mb-4">
                This service lets customers submit a quote request (addresses, preferred date, description of the items,
                and photos or documents where relevant). Partner carriers whose profile and availability match
                receive the request and may submit their own price offer.
              </p>

              <ul className="space-y-3 mb-4">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">
                    The customer compares the offers received and accepts the one they choose. The other offers are then rejected automatically.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">
                    Prices are shown in EUR for a Europe → Tunisia trip and in TND for a Tunisia → Europe trip,
                    according to the direction chosen by the customer.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">
                    After an offer is accepted, the customer&apos;s and the carrier&apos;s contact details may be exchanged
                    so they can arrange delivery. TuniDrive does not carry out the physical transport and does not handle payment between the parties, unless a specific feature on the platform says otherwise.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">
                    The customer agrees to describe the contents of the shipment accurately and not to use the service for goods
                    that are prohibited, dangerous, or subject to customs restrictions without the required declarations.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">
                    Requests that do not result in a booking may expire after a period set by the platform. The carrier remains free
                    to accept or decline any request sent to them.
                  </span>
                </li>
              </ul>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-gray-700 text-sm">
                  <strong>Reminder:</strong> TuniDrive only helps the parties meet and compare quotes.
                  The transport contract and responsibility for carrying it out belong to the customer and the chosen partner carrier.
                </p>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <CreditCard size={24} className="text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">5. Fares and payment</h2>
              </div>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">The trip price is shown to the customer before the booking is confirmed.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Payment is made directly between the customer and the driver, unless stated otherwise (online payment through the platform, if available).</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">
                    For parcel quotes, the price shown in the carrier&apos;s offer is the accepted quote;
                    payment terms are agreed directly between the customer and the carrier, unless the platform states otherwise.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Drivers and carriers may be charged a monthly subscription to use the platform.</span>
                </li>
              </ul>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">6. Cancellation</h2>
              </div>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">The customer and the driver may cancel a private-hire booking up to 24 hours before the scheduled pickup time.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">
                    For parcel quote requests, cancellation or withdrawal before an offer is accepted can be done
                    from the customer account; after acceptance, the parties agree the cancellation terms between themselves.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">A late or repeated cancellation may lead to penalties or to suspension of the account.</span>
                </li>
              </ul>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Shield size={24} className="text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">7. User obligations</h2>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3">For customers:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2"></div>
                      <span className="text-blue-800 text-sm">Treat drivers and their vehicles with respect.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2"></div>
                      <span className="text-blue-800 text-sm">Do not use the platform for fraudulent purposes.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2"></div>
                      <span className="text-blue-800 text-sm">For parcel shipments: provide an accurate description of the contents and comply with the applicable customs rules.</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-3">For drivers (passenger transport):</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2"></div>
                      <span className="text-green-800 text-sm">Hold an operating card or an authorisation to transport passengers.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2"></div>
                      <span className="text-green-800 text-sm">Have insurance that covers passenger transport.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2"></div>
                      <span className="text-green-800 text-sm">Provide a vehicle in good condition that meets safety standards.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2"></div>
                      <span className="text-green-800 text-sm">Comply with the applicable legal and tax obligations.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2"></div>
                      <span className="text-green-800 text-sm">Respect the times and routes agreed with customers.</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">For carriers (international parcels):</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-600 rounded-full mt-2"></div>
                      <span className="text-gray-700 text-sm">Hold the authorisations, insurance and capacity required to carry goods on the routes concerned.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-600 rounded-full mt-2"></div>
                      <span className="text-gray-700 text-sm">Propose genuine prices and honour the commitments made after the customer accepts the quote.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-600 rounded-full mt-2"></div>
                      <span className="text-gray-700 text-sm">Comply with customs rules and with bans on the goods being carried.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-gray-600 rounded-full mt-2"></div>
                      <span className="text-gray-700 text-sm">Keep availability up to date on the platform so requests can be matched properly.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mb-12">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center shadow-sm">
                  <AlertTriangle size={26} className="text-orange-600" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">8. Liability</h2>
                  <p className="text-sm text-gray-500 mt-1">Legal framework for use of the TuniDrive.net platform</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-2xl shadow-sm p-8">
                <h3 className="text-lg font-semibold text-orange-700 mb-5">Liability principles</h3>

                <ul className="space-y-5">
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5">
                      <div className="w-2.5 h-2.5 bg-orange-600 rounded-full"></div>
                    </div>
                    <p className="text-gray-800 leading-relaxed">
                      <strong className="text-orange-800">TuniDrive.net</strong> acts only as a
                      <strong> technical intermediary </strong> that connects customers with independent drivers or carriers.
                    </p>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="mt-1.5">
                      <div className="w-2.5 h-2.5 bg-orange-600 rounded-full"></div>
                    </div>
                    <p className="text-gray-800 leading-relaxed">
                      TuniDrive does not carry passengers or parcels, and it does not manage the service itself.
                      It cannot be held liable for the quality of the services, delays, cancellations, losses, damage,
                      customs delays, or any harm suffered during a trip or a delivery.
                    </p>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="mt-1.5">
                      <div className="w-2.5 h-2.5 bg-orange-600 rounded-full"></div>
                    </div>
                    <p className="text-gray-800 leading-relaxed">
                      Each driver or carrier is <strong>solely responsible</strong> for their services towards customers and acts independently.
                    </p>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="mt-1.5">
                      <div className="w-2.5 h-2.5 bg-orange-600 rounded-full"></div>
                    </div>
                    <p className="text-gray-800 leading-relaxed">
                      Services are performed under the <strong>exclusive responsibility</strong> of the partner professionals, who must hold
                      all required <strong>legal authorisations</strong> (passenger transport, goods transport, insurance, customs, and so on)
                      in line with the rules that apply in Tunisia, in Europe and on the routes they use.
                      They are responsible for safety, vehicle compliance, packaging, declaring parcel contents
                      and observing the highway code.
                    </p>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Users size={24} className="text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">9. Suspension or closure of an account</h2>
              </div>

              <p className="text-gray-700 mb-4">
                TuniDrive.net may suspend or delete the account of any user (customer, driver or carrier) in the event of:
              </p>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">A breach of these terms.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Fraudulent or abusive use of the platform.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">False information provided at signup.</span>
                </li>
              </ul>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Shield size={24} className="text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">10. Personal data</h2>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-purple-800">
                  Using the platform involves the collection and processing of personal data.
                  How that data is handled is described in our{' '}
                  <Link to={href('/privacy-policy')} className="font-semibold underline underline-offset-2">
                    privacy policy
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileText size={24} className="text-gray-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">11. Intellectual property</h2>
              </div>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">All content on TuniDrive.net (text, logos, design, code, and so on) is protected by copyright.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-gray-600 rounded-full mt-2"></div>
                  <span className="text-gray-700">Any reproduction or use without prior permission is prohibited.</span>
                </li>
              </ul>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar size={24} className="text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">12. Changes to these terms</h2>
              </div>

              <div className="space-y-4">
                <p className="text-gray-700">
                  We may change these terms at any time.
                </p>
                <p className="text-gray-700">
                  The current version will always be available on the website.
                </p>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Scale size={24} className="text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">13. Governing law</h2>
              </div>

              <div className="space-y-4">
                <p className="text-gray-700">
                  These terms are governed by Tunisian law.
                </p>
                <p className="text-gray-700">
                  Any dispute relating to use of the website is subject to the exclusive jurisdiction of the Tunisian courts.
                </p>
              </div>
            </div>

            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Mail size={24} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">14. Contact</h2>
              </div>

              <p className="text-gray-700 mb-4">
                For any question about these terms of use:
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
