import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Shield } from "lucide-react";

interface SubscriptionFormProps {
  selectedPlan?: 'starter' | 'professional' | 'enterprise';
}

export default function SubscriptionForm({ selectedPlan = 'professional' }: SubscriptionFormProps) {
  const [plan, setPlan] = useState(selectedPlan);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = {
    starter: { name: 'Starter', price: 49, yearlyPrice: 39 },
    professional: { name: 'Professional', price: 149, yearlyPrice: 119 },
    enterprise: { name: 'Enterprise', price: 499, yearlyPrice: 399 }
  };

  const currentPrice = billingCycle === 'yearly' ? plans[plan].yearlyPrice : plans[plan].price;
  const savings = billingCycle === 'yearly' ? ((plans[plan].price - plans[plan].yearlyPrice) * 12) : 0;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Plan Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Plan</CardTitle>
            <CardDescription>Select the plan that best fits your needs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Billing Cycle Toggle */}
            <div className="flex items-center justify-center space-x-4 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Yearly
                {billingCycle === 'yearly' && <Badge variant="secondary" className="ml-2">Save 20%</Badge>}
              </button>
            </div>

            {/* Plan Options */}
            <div className="space-y-4">
              {Object.entries(plans).map(([key, planInfo]) => (
                <div
                  key={key}
                  onClick={() => setPlan(key as any)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    plan === key
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        plan === key
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground'
                      }`}>
                        {plan === key && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />}
                      </div>
                      <div>
                        <h3 className="font-semibold">{planInfo.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          ${billingCycle === 'yearly' ? planInfo.yearlyPrice : planInfo.price}/{billingCycle === 'yearly' ? 'month' : 'month'}
                        </p>
                      </div>
                    </div>
                    {billingCycle === 'yearly' && (
                      <Badge variant="outline">
                        Save ${(planInfo.price - planInfo.yearlyPrice) * 12}/year
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Plan Features */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-3">{plans[plan].name} includes:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-primary mr-2" />
                  {plan === 'starter' && '1 AI Agent'}
                  {plan === 'professional' && '5 AI Agents'}
                  {plan === 'enterprise' && 'Unlimited AI Agents'}
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-primary mr-2" />
                  {plan === 'starter' && '1,000 conversations/month'}
                  {plan === 'professional' && '10,000 conversations/month'}
                  {plan === 'enterprise' && 'Unlimited conversations'}
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-primary mr-2" />
                  {plan === 'starter' && 'Basic analytics'}
                  {plan === 'professional' && 'Advanced analytics'}
                  {plan === 'enterprise' && 'Enterprise analytics'}
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 text-primary mr-2" />
                  {plan === 'starter' && 'Email support'}
                  {plan === 'professional' && 'Priority support'}
                  {plan === 'enterprise' && '24/7 dedicated support'}
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Payment Details
            </CardTitle>
            <CardDescription>Secure payment powered by Stripe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Order Summary */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">{plans[plan].name} Plan</span>
                <span className="font-semibold">${currentPrice}/{billingCycle === 'yearly' ? 'month' : 'month'}</span>
              </div>
              {billingCycle === 'yearly' && (
                <div className="flex justify-between items-center mb-2 text-sm text-green-600">
                  <span>Annual discount</span>
                  <span>-${savings}/year</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center font-semibold">
                  <span>Total</span>
                  <span>${billingCycle === 'yearly' ? currentPrice * 12 : currentPrice}/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John" />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Doe" />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@company.com" />
              </div>
              <div>
                <Label htmlFor="company">Company (Optional)</Label>
                <Input id="company" placeholder="Acme Corp" />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-4">
              <Label>Payment Method</Label>
              <Select defaultValue="card">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Card Details */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input id="cardNumber" placeholder="1234 5678 9012 3456" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input id="expiry" placeholder="MM/YY" />
                </div>
                <div>
                  <Label htmlFor="cvc">CVC</Label>
                  <Input id="cvc" placeholder="123" />
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-center space-x-2">
              <Checkbox id="terms" />
              <Label htmlFor="terms" className="text-sm">
                I agree to the <a href="/terms" className="text-primary hover:underline">Terms of Service</a> and{' '}
                <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
              </Label>
            </div>

            {/* Submit Button */}
            <Button className="w-full" size="lg">
              <Shield className="h-4 w-4 mr-2" />
              Start {billingCycle === 'yearly' ? 'Annual' : 'Monthly'} Subscription
            </Button>

            {/* Security Notice */}
            <div className="text-center text-sm text-muted-foreground">
              <p>🔒 Your payment information is secure and encrypted</p>
              <p>30-day money-back guarantee</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
