import { useEffect, useState } from 'react';
import { Package, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { adminOrdersService, AdminOrderRecord } from '../utils/adminOrdersService';

export function AdminOrdersPanel() {
  const [orders, setOrders] = useState<AdminOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [refundingOrderId, setRefundingOrderId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, {
    status: AdminOrderRecord['status'];
    tracking_number: string;
    estimated_delivery: string;
  }>>({});

  const loadOrders = async () => {
    try {
      setLoading(true);
      const loadedOrders = await adminOrdersService.getAll();
      setOrders(loadedOrders);
      setDrafts(
        Object.fromEntries(
          loadedOrders.map((order) => [
            order.id,
            {
              status: order.status,
              tracking_number: order.tracking_number || '',
              estimated_delivery: order.estimated_delivery || '',
            },
          ])
        )
      );
    } catch (error: any) {
      console.error('Failed to load admin orders:', error);
      toast.error(error.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const getStatusBadge = (status: AdminOrderRecord['status']) => {
    const variants: Record<string, string> = {
      delivered: 'bg-green-100 text-green-800 border-green-200',
      'in-transit': 'bg-blue-100 text-blue-800 border-blue-200',
      processing: 'bg-orange-100 text-orange-800 border-orange-200',
      confirmed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      refunded: 'bg-red-100 text-red-800 border-red-200',
    };

    return <Badge className={`${variants[status]} border`}>{status}</Badge>;
  };

  const handleSave = async (orderId: string) => {
    const draft = drafts[orderId];
    if (!draft) return;

    try {
      setSavingOrderId(orderId);
      const updated = await adminOrdersService.updateOrder(orderId, {
        status: draft.status,
        tracking_number: draft.tracking_number || null,
        estimated_delivery: draft.estimated_delivery || null,
      });

      setOrders(orders.map((order) => (order.id === orderId ? updated : order)));
      toast.success(`Order ${updated.order_number} updated`);
    } catch (error: any) {
      console.error('Failed to update order:', error);
      toast.error(error.message || 'Failed to update order');
    } finally {
      setSavingOrderId(null);
    }
  };

  const handleRefund = async (orderId: string) => {
    if (!window.confirm('Process a Stripe refund for this order?')) {
      return;
    }

    try {
      setRefundingOrderId(orderId);
      const updated = await adminOrdersService.processRefund(orderId);
      setOrders(orders.map((order) => (order.id === orderId ? updated : order)));
      setDrafts({
        ...drafts,
        [orderId]: {
          status: updated.status,
          tracking_number: updated.tracking_number || '',
          estimated_delivery: updated.estimated_delivery || '',
        },
      });
      toast.success(`Refund processed for ${updated.order_number}`);
    } catch (error: any) {
      console.error('Failed to process refund:', error);
      toast.error(error.message || 'Failed to process refund');
    } finally {
      setRefundingOrderId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366]"></div>
        <p className="text-gray-600 mt-4">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[#003366]">Order Management</h2>
          <p className="text-sm text-gray-600">Update fulfillment state and process Stripe refunds.</p>
        </div>
        <Button variant="outline" onClick={loadOrders}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            No orders found.
          </CardContent>
        </Card>
      ) : (
        orders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle>{order.order_number}</CardTitle>
                  <CardDescription>
                    {order.shipping_full_name} • {order.shipping_email} • ${order.total.toFixed(2)}
                  </CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  {getStatusBadge(order.status)}
                  <Badge variant="outline">{order.payment_status}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={drafts[order.id]?.status || order.status}
                    onValueChange={(value: AdminOrderRecord['status']) =>
                      setDrafts({
                        ...drafts,
                        [order.id]: {
                          ...(drafts[order.id] || {
                            status: order.status,
                            tracking_number: order.tracking_number || '',
                            estimated_delivery: order.estimated_delivery || '',
                          }),
                          status: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="in-transit">In Transit</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tracking Number</Label>
                  <Input
                    value={drafts[order.id]?.tracking_number || ''}
                    onChange={(e) =>
                      setDrafts({
                        ...drafts,
                        [order.id]: {
                          ...(drafts[order.id] || {
                            status: order.status,
                            tracking_number: order.tracking_number || '',
                            estimated_delivery: order.estimated_delivery || '',
                          }),
                          tracking_number: e.target.value,
                        },
                      })
                    }
                    placeholder="Optional tracking number"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estimated Delivery</Label>
                  <Input
                    type="date"
                    value={drafts[order.id]?.estimated_delivery || ''}
                    onChange={(e) =>
                      setDrafts({
                        ...drafts,
                        [order.id]: {
                          ...(drafts[order.id] || {
                            status: order.status,
                            tracking_number: order.tracking_number || '',
                            estimated_delivery: order.estimated_delivery || '',
                          }),
                          estimated_delivery: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 text-sm space-y-1">
                <p>{order.shipping_address}</p>
                <p>{order.shipping_city}, {order.shipping_state} {order.shipping_zip_code}</p>
                <p>{order.shipping_country}</p>
                <p>Items: {order.items.map((item) => `${item.product_name} x${item.quantity}`).join(', ')}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => handleSave(order.id)}
                  disabled={savingOrderId === order.id}
                  className="bg-[#003366] hover:bg-[#0055AA] text-white"
                >
                  {savingOrderId === order.id ? 'Saving...' : 'Save Update'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleRefund(order.id)}
                  disabled={
                    refundingOrderId === order.id ||
                    !order.payment_transaction_id ||
                    order.payment_status === 'refunded'
                  }
                >
                  {refundingOrderId === order.id ? 'Processing Refund...' : 'Process Refund'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
