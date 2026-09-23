import { Mail, Phone, MapPin, Clock, MessageSquare, HeadphonesIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    category: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Thank you for your message! We will get back to you within 24 hours.');
    setFormData({ name: '', email: '', phone: '', subject: '', category: '', message: '' });
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-12">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#003366] to-[#0055AA] text-white rounded-lg shadow-lg p-6 md:p-12 mb-8">
        <div className="max-w-3xl">
          <h1 className="mb-4">Get In Touch</h1>
          <p className="text-lg md:text-xl text-blue-100 leading-relaxed">
            Need something sourced or shipped? The Source Sevens team can assist with orders, product
            sourcing questions and shipping to Jamaica.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Quick Contact Cards */}
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-[#003366] hover:shadow-md transition-shadow">
          <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Phone className="h-6 w-6 text-[#003366]" />
          </div>
          <h3 className="text-[#003366] mb-2">Call Us</h3>
          <p className="text-gray-600 text-sm mb-3">
            Speak with Source Sevens support
          </p>
          <a href="tel:+18765776682" className="text-[#003366] hover:underline font-semibold">
            (876) 577-6682
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-[#FF9900] hover:shadow-md transition-shadow">
          <div className="bg-orange-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-[#FF9900]" />
          </div>
          <h3 className="text-[#003366] mb-2">Email Us</h3>
          <p className="text-gray-600 text-sm mb-3">
            Source Sevens typically responds within 24 hours
          </p>
          <a href="mailto:Sevensjamaica@gmail.com" className="text-[#FF9900] hover:underline font-semibold break-all">
            Sevensjamaica@gmail.com
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-[#003366] hover:shadow-md transition-shadow">
          <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="h-6 w-6 text-[#003366]" />
          </div>
          <h3 className="text-[#003366] mb-2">Follow Us</h3>
          <p className="text-gray-600 text-sm mb-3">
            Follow Source Sevens on Instagram
          </p>
          <a
            href="https://www.instagram.com/jarenegades/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#003366] hover:underline font-semibold"
          >
            @jarenegades →
          </a>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Contact Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-[#003366] w-10 h-10 rounded-full flex items-center justify-center">
              <HeadphonesIcon className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-[#003366]">Send Us a Message</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="John Doe"
                  className="border-gray-300 focus:border-[#003366] focus:ring-[#003366]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="john@example.com"
                  className="border-gray-300 focus:border-[#003366] focus:ring-[#003366]"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="border-gray-300 focus:border-[#003366] focus:ring-[#003366]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger className="border-gray-300 focus:border-[#003366] focus:ring-[#003366]">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order">Order Inquiry</SelectItem>
                    <SelectItem value="product">Product Question</SelectItem>
                    <SelectItem value="shipping">Shipping & Delivery</SelectItem>
                    <SelectItem value="return">Returns & Refunds</SelectItem>
                    <SelectItem value="account">Account Support</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                placeholder="How can we help?"
                className="border-gray-300 focus:border-[#003366] focus:ring-[#003366]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                placeholder="Please provide details about your inquiry..."
                rows={5}
                className="border-gray-300 focus:border-[#003366] focus:ring-[#003366]"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#003366] hover:bg-[#0055AA] text-white"
            >
              Send Message
            </Button>
          </form>
        </div>

        {/* Info & Map */}
        <div className="space-y-6">
          {/* Office Info */}
          <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-lg p-6 md:p-8">
            <h3 className="text-[#003366] mb-6">Source Sevens Information</h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-[#003366] mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-[#003366] mb-1">Source Sevens</p>
                  <p className="text-gray-700 text-sm">
                    Kingston, Jamaica<br />
                    Sourcing from suppliers worldwide
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-[#FF9900] mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-[#003366] mb-1">Online Support</p>
                  <p className="text-gray-700 text-sm">
                    24/7 Online Ordering Available<br />
                    Customer Support During Business Hours
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* About Our Service */}
          <div className="bg-[#003366] text-white rounded-lg p-6">
            <h3 className="mb-2">About Source Sevens</h3>
            <p className="text-sm text-blue-100 mb-3">
              A Kingston, Jamaica logistics company backed by practical sourcing experience and responsive service.
            </p>
            <p className="text-sm text-blue-100">
              Source Sevens specializes in package shipping, product sourcing and related services between overseas suppliers and Jamaica.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
