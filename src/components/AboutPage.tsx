import { Shield, Truck, Award, Package, Ship, Globe } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-12">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#003366] to-[#0055AA] text-white rounded-lg shadow-lg p-6 md:p-12 mb-8">
        <div className="max-w-3xl">
          <h1 className="mb-4 md:mb-6">About Source Sevens</h1>
          <p className="text-lg md:text-xl text-blue-100 leading-relaxed">
            Source Sevens is a Kingston, Jamaica based logistics company. We source products from
            overseas suppliers, consolidate and ship them, and handle the related services in
            between so you don't have to deal with multiple vendors and carriers yourself.
          </p>
        </div>
      </div>

      {/* Values Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-[#DC143C] hover:shadow-md transition-shadow">
          <div className="bg-red-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-[#DC143C]" />
          </div>
          <h3 className="text-[#003366] mb-3">Integrity</h3>
          <p className="text-gray-600">
            We operate with transparency and honesty in every transaction, so you always know
            where your order and your shipment stand.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-[#FF9900] hover:shadow-md transition-shadow">
          <div className="bg-orange-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Truck className="h-6 w-6 text-[#FF9900]" />
          </div>
          <h3 className="text-[#003366] mb-3">Reliability</h3>
          <p className="text-gray-600">
            Dependable sourcing and shipping timelines are at the heart of our operations, so you
            can plan around when your package will actually arrive.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-[#003366] hover:shadow-md transition-shadow">
          <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Award className="h-6 w-6 text-[#003366]" />
          </div>
          <h3 className="text-[#003366] mb-3">Quality Assurance</h3>
          <p className="text-gray-600">
            We check what we source before it ships, so what arrives in Kingston is what you
            actually ordered.
          </p>
        </div>
      </div>

      {/* Our Story */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
          <h2 className="text-[#003366] mb-4">Our Story</h2>
          <div className="space-y-4 text-gray-700">
            <p>
              Source Sevens was built to close the gap between customers in Jamaica and suppliers
              overseas. From our base in Kingston, we help individuals and businesses find,
              purchase and ship products they can't easily get locally.
            </p>
            <p>
              Our storefront doubles as a working example of what we source: industrial parts
              like bearings and mounted linear units, alongside whatever else our customers need
              us to track down and bring in.
            </p>
            <p>
              We pair a clear online ordering experience with hands-on support, so sourcing and
              shipping something to Jamaica feels like one service, not several.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-blue-50 rounded-lg shadow-sm p-6 md:p-8">
          <h2 className="text-[#003366] mb-6">Our Mission & Vision</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-[#DC143C] mb-2">Mission</h3>
              <p className="text-sm text-gray-700">
                To make sourcing and shipping products to Jamaica simple, with clear pricing,
                honest timelines and support you can actually reach.
              </p>
            </div>
            <div>
              <h3 className="text-[#003366] mb-2">Vision</h3>
              <p className="text-sm text-gray-700">
                To be Jamaica's preferred partner for product sourcing and package shipping, for
                individuals and businesses alike.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Products & Services */}
      <div className="bg-white rounded-lg shadow-sm p-6 md:p-8 mb-12">
        <h2 className="text-[#003366] mb-6 text-center">What We Do</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-[#DC143C]" />
            </div>
            <h3 className="text-[#003366] mb-2">Product Sourcing</h3>
            <p className="text-gray-600 text-sm">
              Tell us what you need, from industrial parts to hard-to-find items, and we track
              down a supplier and a price.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Ship className="h-8 w-8 text-[#FF9900]" />
            </div>
            <h3 className="text-[#003366] mb-2">Package Shipping</h3>
            <p className="text-gray-600 text-sm">
              We consolidate and ship purchases to Kingston, so multiple orders can travel and
              clear as one shipment.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Globe className="h-8 w-8 text-[#003366]" />
            </div>
            <h3 className="text-[#003366] mb-2">Other Related Services</h3>
            <p className="text-gray-600 text-sm">
              From order tracking to delivery coordination, we handle the details around getting
              a purchase from overseas to your door.
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <section className="rounded-xl overflow-hidden border border-blue-100 shadow-sm mb-12">
        <div className="grid lg:grid-cols-[0.9fr_1.4fr]">
          <div className="bg-[#003366] text-white p-6 md:p-8 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#FFB000] mb-3">How it works</p>
              <h2 className="mb-4">From order to your door</h2>
              <p className="text-blue-100 leading-relaxed">
                Three steps take a product from an overseas supplier to you in Jamaica.
              </p>
            </div>
            <p className="text-sm text-blue-200 mt-8 pt-5 border-t border-blue-400/30">
              Every order is confirmed with you by Source Sevens before it ships.
            </p>
          </div>

          <div className="bg-white p-4 md:p-6 grid sm:grid-cols-3 gap-3">
            {[
              ['1. Order or Request', 'Buy from our catalog, or tell us what you need sourced and we\'ll find it.'],
              ['2. We Source & Ship', 'We purchase, consolidate and ship your order from the supplier.'],
              ['3. Delivered in Jamaica', 'Your package clears and is delivered or ready for pickup in Kingston.'],
            ].map(([name, detail]) => (
              <div key={name} className="min-h-32 rounded-lg border border-gray-200 p-5 flex flex-col justify-between">
                <h3 className="text-[#003366] text-lg font-semibold">{name}</h3>
                <p className="text-sm text-gray-600 leading-snug">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Experience */}
      <div className="bg-white rounded-lg shadow-sm p-6 md:p-8 text-center">
        <h3 className="text-[#003366] mb-4">Why Source Sevens</h3>
        <p className="text-gray-700 mb-6 max-w-3xl mx-auto">
          We understand the local market and the friction of shipping to Jamaica, so we handle
          the sourcing, the shipping and the coordination in between as one service.
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
          <span className="bg-blue-50 px-4 py-2 rounded-full">Based in Kingston, Jamaica</span>
          <span className="bg-red-50 px-4 py-2 rounded-full">Worldwide Sourcing</span>
          <span className="bg-orange-50 px-4 py-2 rounded-full">Reliable Shipping</span>
          <span className="bg-blue-50 px-4 py-2 rounded-full">Direct Support</span>
        </div>
      </div>
    </div>
  );
}
