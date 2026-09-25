import { Package, Truck, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useState, useEffect } from 'react';
import { ordersService, OrderWithItems } from '../utils/ordersService';
import { authService } from '../utils/authService';
import { formatCurrency } from '../utils/currencyService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: 'delivered' | 'in-transit' | 'processing' | 'cancelled' | 'confirmed' | 'refunded';
  total: number;
  currency: 'USD' | 'JMD' | 'CAD';
  subtotal: number;
  tax: number;
  shippingCost: number;
  shippingMethod?: string;
  paymentStatus: string;
  shippingFullName: string;
  shippingEmail: string;
  shippingPhone?: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingZipCode: string;
  shippingCountry: string;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    image: string;
  }[];
  trackingNumber?: string;
  estimatedDelivery?: string;
}

interface OrdersPageProps {
  onProductClick: (productId: string) => void;
}

export function OrdersPage({ onProductClick }: OrdersPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const user = await authService.getCurrentUser();
      if (!user?.id) {
        setError('User not authenticated');
        setOrders([]);
        return;
      }

      console.log('📦 Loading orders for user:', user.id);

      // Fetch orders from the Neon account API
      const neonOrders = await ordersService.getAllByUser(user.id);

      console.log(`✅ Loaded ${neonOrders.length} orders from database`);

      // Map Neon orders to component format
      const mappedOrders: Order[] = neonOrders.map((order: OrderWithItems) => ({
        id: order.id,
        orderNumber: order.order_number,
        date: new Date(order.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        status: order.status === 'confirmed' ? 'processing' : order.status as Order['status'],
        total: order.total,
        currency: order.currency || 'USD',
        subtotal: order.subtotal,
        tax: order.tax,
        shippingCost: order.shipping_cost,
        shippingMethod: order.shipping_method || undefined,
        paymentStatus: order.payment_status,
        shippingFullName: order.shipping_full_name,
        shippingEmail: order.shipping_email,
        shippingPhone: order.shipping_phone || undefined,
        shippingAddress: order.shipping_address,
        shippingCity: order.shipping_city,
        shippingState: order.shipping_state,
        shippingZipCode: order.shipping_zip_code,
        shippingCountry: order.shipping_country,
        trackingNumber: order.tracking_number,
        estimatedDelivery: order.estimated_delivery ? new Date(order.estimated_delivery).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }) : undefined,
        items: order.items.map(item => ({
          id: item.product_id,
          name: item.product_name,
          quantity: item.quantity,
          price: item.unit_price,
          image: item.product_image_url || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400'
        }))
      }));

      setOrders(mappedOrders);
    } catch (err) {
      console.error('❌ Failed to load orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in-transit':
        return <Truck className="h-5 w-5 text-blue-600" />;
      case 'processing':
      case 'confirmed':
        return <Clock className="h-5 w-5 text-orange-600" />;
      case 'cancelled':
      case 'refunded':
        return <Package className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    const variants: Record<string, string> = {
      delivered: 'bg-green-100 text-green-800 border-green-200',
      'in-transit': 'bg-blue-100 text-blue-800 border-blue-200',
      processing: 'bg-orange-100 text-orange-800 border-orange-200',
      confirmed: 'bg-orange-100 text-orange-800 border-orange-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      refunded: 'bg-red-100 text-red-800 border-red-200',
    };

    const labels: Record<string, string> = {
      delivered: 'Delivered',
      'in-transit': 'In Transit',
      processing: 'Processing',
      confirmed: 'Confirmed',
      cancelled: 'Cancelled',
      refunded: 'Refunded',
    };

    return (
      <Badge className={`${variants[status]} border`}>
        {labels[status]}
      </Badge>
    );
  };

  const openReceiptPdf = (order: Order) => {
    const receiptHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt ${order.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1, h2, h3 { margin: 0 0 12px 0; }
            .row { display: flex; justify-content: space-between; margin: 6px 0; }
            .section { margin-top: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { text-align: left; padding: 10px; border-bottom: 1px solid #e5e7eb; }
            .muted { color: #6b7280; }
          </style>
        </head>
        <body>
          <h1>Source Sevens Receipt</h1>
          <div class="section">
            <div class="row"><strong>Order</strong><span>${order.orderNumber}</span></div>
            <div class="row"><strong>Date</strong><span>${order.date}</span></div>
            <div class="row"><strong>Status</strong><span>${order.status}</span></div>
            <div class="row"><strong>Payment</strong><span>${order.paymentStatus}</span></div>
          </div>

          <div class="section">
            <h3>Customer</h3>
            <div>${order.shippingFullName}</div>
            <div class="muted">${order.shippingEmail}</div>
            <div class="muted">${order.shippingPhone || ''}</div>
          </div>

          <div class="section">
            <h3>Shipping Address</h3>
            <div>${order.shippingAddress}</div>
            <div>${order.shippingCity}, ${order.shippingState} ${order.shippingZipCode}</div>
            <div>${order.shippingCountry}</div>
            <div class="muted">Method: ${order.shippingMethod || 'standard'}</div>
          </div>

          <div class="section">
            <h3>Items</h3>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map((item) => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.price, order.currency)}</td>
                    <td>${formatCurrency(item.price * item.quantity, order.currency)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="row"><strong>Subtotal</strong><span>${formatCurrency(order.subtotal, order.currency)}</span></div>
            <div class="row"><strong>Tax</strong><span>${formatCurrency(order.tax, order.currency)}</span></div>
            <div class="row"><strong>Shipping</strong><span>${formatCurrency(order.shippingCost, order.currency)}</span></div>
            <div class="row"><strong>Total</strong><span>${formatCurrency(order.total, order.currency)}</span></div>
          </div>
        </body>
      </html>
    `;

    const receiptWindow = window.open('', '_blank', 'width=900,height=700');
    if (!receiptWindow) {
      return;
    }

    receiptWindow.document.open();
    receiptWindow.document.write(receiptHtml);
    receiptWindow.document.close();
    receiptWindow.focus();
    receiptWindow.print();
  };

  const allOrders = orders;
  const activeOrders = orders.filter(o => 
    o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'refunded'
  );
  const completedOrders = orders.filter(o => o.status === 'delivered');

  const renderOrders = (orderList: Order[]) => {
    if (orderList.length === 0) {
      return (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No orders found</p>
          <p className="text-sm text-gray-500">Your orders will appear here</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {orderList.map((order) => (
          <Card key={order.id} className="p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4 pb-4 border-b">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-[#003366]">Order {order.orderNumber}</h3>
                  {getStatusBadge(order.status)}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  {getStatusIcon(order.status)}
                  <span>Placed on {order.date}</span>
                </div>
                {order.trackingNumber && (
                  <p className="text-sm text-gray-600">
                    Tracking: <span className="text-[#003366] font-mono">{order.trackingNumber}</span>
                  </p>
                )}
                {order.estimatedDelivery && order.status !== 'delivered' && (
                  <p className="text-sm text-gray-600">
                    Estimated Delivery: <span className="text-[#003366]">{order.estimatedDelivery}</span>
                  </p>
                )}
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl text-[#DC143C]">{formatCurrency(order.total, order.currency)}</p>
              </div>
            </div>

            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div 
                    className="w-20 h-20 bg-gray-100 rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                    onClick={() => onProductClick(item.id)}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 
                      className="text-gray-900 mb-1 cursor-pointer hover:text-[#003366] transition-colors line-clamp-2"
                      onClick={() => onProductClick(item.id)}
                    >
                      {item.name}
                    </h4>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                    <p className="text-sm text-gray-600">{formatCurrency(item.price, order.currency)} each</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-gray-900">
                      {formatCurrency(item.price * item.quantity, order.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t">
              {order.status === 'in-transit' && (
                <Button variant="outline" className="flex-1">
                  Track Package
                </Button>
              )}
              {order.status === 'delivered' && (
                <>
                  <Button variant="outline" className="flex-1">
                    Buy Again
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Leave Review
                  </Button>
                </>
              )}
              <Button variant="outline" className="flex-1" onClick={() => setSelectedOrder(order)}>
                View Details
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => openReceiptPdf(order)}>
                Save PDF Receipt
              </Button>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-[#003366] mb-2">Your Orders</h1>
        <p className="text-gray-600">View and track your orders</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366]"></div>
          <p className="text-gray-600 mt-4">Loading your orders...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-red-800 font-semibold mb-2">Error Loading Orders</h3>
          <p className="text-red-600">{error}</p>
          <Button 
            onClick={loadOrders} 
            className="mt-4 bg-red-600 hover:bg-red-700"
          >
            Try Again
          </Button>
        </div>
      ) : (
        <>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 mb-6">
              <TabsTrigger value="all">All Orders ({allOrders.length})</TabsTrigger>
              <TabsTrigger value="active">Active ({activeOrders.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedOrders.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              {renderOrders(allOrders)}
            </TabsContent>

            <TabsContent value="active">
              {renderOrders(activeOrders)}
            </TabsContent>

            <TabsContent value="completed">
              {renderOrders(completedOrders)}
            </TabsContent>
          </Tabs>

          <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
            <DialogContent className="sm:max-w-2xl">
              {selectedOrder && (
                <>
                  <DialogHeader>
                    <DialogTitle>Order {selectedOrder.orderNumber}</DialogTitle>
                    <DialogDescription>
                      Placed on {selectedOrder.date}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="font-semibold text-[#003366]">Customer</p>
                        <p>{selectedOrder.shippingFullName}</p>
                        <p>{selectedOrder.shippingEmail}</p>
                        {selectedOrder.shippingPhone && <p>{selectedOrder.shippingPhone}</p>}
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-[#003366]">Shipping</p>
                        <p>{selectedOrder.shippingAddress}</p>
                        <p>{selectedOrder.shippingCity}, {selectedOrder.shippingState} {selectedOrder.shippingZipCode}</p>
                        <p>{selectedOrder.shippingCountry}</p>
                        <p>Method: {selectedOrder.shippingMethod || 'standard'}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="font-semibold text-[#003366]">Items</p>
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-4 text-sm border rounded-lg p-3">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-gray-600">Qty: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p>{formatCurrency(item.price, selectedOrder.currency)} each</p>
                            <p className="font-semibold">{formatCurrency(item.price * item.quantity, selectedOrder.currency)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
                      <div className="flex justify-between"><span>Status</span><span>{selectedOrder.status}</span></div>
                      <div className="flex justify-between"><span>Payment</span><span>{selectedOrder.paymentStatus}</span></div>
                      <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(selectedOrder.subtotal, selectedOrder.currency)}</span></div>
                      <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(selectedOrder.tax, selectedOrder.currency)}</span></div>
                      <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(selectedOrder.shippingCost, selectedOrder.currency)}</span></div>
                      <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(selectedOrder.total, selectedOrder.currency)}</span></div>
                    </div>

                    <div className="flex justify-end">
                      <Button variant="outline" onClick={() => openReceiptPdf(selectedOrder)}>
                        Save PDF Receipt
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
