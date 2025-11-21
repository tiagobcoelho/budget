'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Target,
  Users,
  CheckCircle2,
  PieChart,
  Brain,
  Zap,
  Shield,
  ChevronDown,
  TrendingUp,
  DollarSign,
  Clock,
  Sparkles,
} from 'lucide-react'

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
}

export default function LandingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>(
    'monthly'
  )
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const testimonials = [
    {
      text: 'Budget Copilot is like having a financial bestie who actually knows their stuff. The AI categorization is scary accurate!',
      author: 'Sarah Mitchell',
      handle: '@sarahmoney',
    },
    {
      text: "Finally, a budget app that doesn't lecture me. It just helps. Love the friendly vibes!",
      author: 'Marcus Chen',
      handle: '@marcusc',
    },
    {
      text: 'Saved over €2,000 in 3 months just by following the AI suggestions. My copilot deserves a raise!',
      author: 'Emma Rodriguez',
      handle: '@emmarodr',
    },
    {
      text: 'Couple mode = relationship saver. We track shared expenses without the drama. Thank you Budget Copilot!',
      author: 'David & Lisa Park',
      handle: '@parkfamily',
    },
    {
      text: 'Upload. Boom. Done. Imported 6 months of bank statements in seconds. This thing is magical.',
      author: 'James Wilson',
      handle: '@jameswilson',
    },
    {
      text: 'Already saved 15x what I paid. Budget Copilot basically pays for my coffee habit now.',
      author: 'Priya Sharma',
      handle: '@priyasaves',
    },
    {
      text: 'Those visual reports? Eye-opening. I had no idea I spent that much on takeout. Oops.',
      author: 'Tom Anderson',
      handle: '@tomanderson',
    },
    {
      text: 'Beautiful design, zero judgment, actually useful. My new favorite app!',
      author: 'Rachel Green',
      handle: '@rachelg',
    },
    {
      text: "Ditched 3 other apps for this. Budget Copilot does it all and doesn't make me feel bad about spending.",
      author: 'Alex Kumar',
      handle: '@alexkumar',
    },
    {
      text: "It's like having a financial advisor who speaks human. The insights are spot on.",
      author: 'Sophie Laurent',
      handle: '@sophielaurent',
    },
    {
      text: 'Procrastinated for months. Started using this. Savings account finally growing. Better late than never!',
      author: 'Mike Thompson',
      handle: '@mikethompson',
    },
    {
      text: 'Support team is amazing and super friendly. They set up everything exactly how I needed it!',
      author: 'Nina Patel',
      handle: '@ninapatel',
    },
  ]

  // Split testimonials into 3 columns
  const column1 = testimonials.slice(0, 4)
  const column2 = testimonials.slice(4, 8)
  const column3 = testimonials.slice(8, 12)

  const features = [
    {
      icon: Brain,
      title: 'AI-powered insights',
      description:
        'Your copilot analyzes spending patterns and gives you personalized tips to save more, stress less.',
    },
    {
      icon: Zap,
      title: 'Instant transaction import',
      description:
        'Upload bank statements or screenshots. AI reads them, categorizes everything. You? Just relax.',
    },
    {
      icon: Target,
      title: 'Smart budget tracking',
      description:
        "Set budgets that actually work. Get real-time updates and friendly nudges when you're close to the edge.",
    },
    {
      icon: PieChart,
      title: 'Beautiful analytics',
      description:
        'Gorgeous charts that show exactly where your money flows—and where you can plug the leaks.',
    },
    {
      icon: Users,
      title: 'Couple mode',
      description:
        "Sync budgets with your partner. Track shared expenses. Avoid the 'wait, you spent what?!' moments.",
    },
    {
      icon: Shield,
      title: 'Bank-level security',
      description:
        'Military-grade encryption keeps your data locked tight. Privacy first, always.',
    },
  ]

  const pricingPlans = [
    {
      name: 'Free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        'Up to 50 transactions/month',
        '3 budget categories',
        'Basic reports',
        'Manual entry only',
      ],
      popular: false,
    },
    {
      name: 'Pro',
      monthlyPrice: 9,
      yearlyPrice: 90,
      features: [
        'Unlimited transactions',
        'Unlimited categories',
        'AI document processing',
        'Advanced insights & recommendations',
        'Priority support',
      ],
      popular: true,
    },
    {
      name: 'Couple',
      monthlyPrice: 15,
      yearlyPrice: 150,
      features: [
        'Everything in Pro',
        '2 user accounts',
        'Shared budgets & goals',
        'Collaborative reports',
        'Sync expenses in real-time',
      ],
      popular: false,
    },
  ]

  const faqItems = [
    {
      question: 'How does the AI transaction import work?',
      answer:
        "Super simple! Upload a bank statement (PDF or screenshot) and our AI reads it, extracts all transactions, and categorizes them automatically. You can tweak things before saving, but honestly? It's pretty accurate right out of the gate.",
    },
    {
      question: 'Is my financial data secure?',
      answer:
        "Absolutely. We use bank-level AES-256 encryption for everything. Your data is encrypted with your unique key, we never touch your banking credentials, and we're fully GDPR compliant. Your secrets are safe with us.",
    },
    {
      question: 'Can I try before I pay?',
      answer:
        'Yep! Start with our Free plan (50 transactions/month) to test the waters. Or grab a paid plan with a 14-day free trial and full access to all the premium goodies. No credit card needed for the free plan.',
    },
    {
      question: 'How does Couple mode work?',
      answer:
        'Two logins, one budget. You and your partner can link accounts, share expenses, and see combined reports. Work toward joint goals while keeping your individual spending private. Win-win!',
    },
    {
      question: 'What file formats do you support for import?',
      answer:
        "PDF bank statements, CSV exports, and images (JPG, PNG). Our AI handles most major bank formats automatically. Got something unusual? Hit up our support team and we'll make it work.",
    },
    {
      question: 'Can I cancel anytime?',
      answer:
        'Of course! Cancel from your account settings whenever you want. You keep access until your billing period ends, and you can always export your data. No hard feelings.',
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4">
        <motion.nav
          animate={{
            width: scrolled ? '80%' : '88%',
            maxWidth: scrolled ? '1000px' : '1200px',
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="rounded-full border border-border/40 bg-background/60 backdrop-blur-xl shadow-lg"
        >
          <div className="flex h-14 items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <PieChart className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xl font-bold">budgetCopilot</span>
            </Link>
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6">
              <button
                onClick={() =>
                  document
                    .getElementById('features')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
                className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
              >
                Features
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById('testimonials')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
                className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
              >
                Testimonials
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById('pricing')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
                className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
              >
                Pricing
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById('faq')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
                className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
              >
                FAQ
              </button>
            </div>
            <Link href="/onboarding">
              <Button size="sm" className="rounded-full">
                Try for Free
              </Button>
            </Link>
          </div>
        </motion.nav>
      </div>
      {/* Add spacer for fixed navbar */}
      <div className="h-20" />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-32  pb-0!">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[1000px] w-[1000px] rounded-full bg-primary/30 blur-[120px]" />
          <div className="absolute right-0 top-1/4 h-[600px] w-[600px] rounded-full bg-accent/25 blur-[80px]" />
          <div className="absolute left-0 bottom-0 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-4xl text-center"
          >
            <h1 className="mb-8 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Take control of your finances,
              <br />
              <span className="italic bg-linear-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                spend with confidence
              </span>
            </h1>
            <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Your AI-powered money sidekick. Track spending, crush goals, and
              save more—without the spreadsheet headaches.
            </p>
            <Link href="/onboarding">
              <Button size="lg" className="rounded-full px-8 text-base h-12">
                Signup for free
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="relative py-24 sm:py-32 overflow-hidden"
      >
        <div className="absolute inset-0 -z-10">
          <div className="absolute right-1/4 top-1/4 h-[700px] w-[700px] rounded-full bg-accent/20 blur-[100px]" />
          <div className="absolute left-1/3 bottom-1/4 h-[600px] w-[600px] rounded-full bg-primary/25 blur-[120px]" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mx-auto max-w-[90vw] relative"
          >
            {/* Floating Stats Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="absolute -top-4 -left-4 sm:-left-8 z-10"
            >
              <Card className="p-4 bg-background/95 backdrop-blur-sm border-border/50 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">+23%</p>
                    <p className="text-xs text-muted-foreground">
                      Savings rate
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="absolute -top-4 -right-4 sm:-right-8 z-10"
            >
              <Card className="p-4 bg-background/95 backdrop-blur-sm border-border/50 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <DollarSign className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">€2.5k</p>
                    <p className="text-xs text-muted-foreground">
                      Saved this month
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10"
            >
              <Card className="p-4 bg-background/95 backdrop-blur-sm border-border/50 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                    <Clock className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">5 min</p>
                    <p className="text-xs text-muted-foreground">Setup time</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            <div className="relative rounded-2xl border border-border/50 bg-muted/30 p-2 backdrop-blur-sm shadow-2xl">
              <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-primary/5 via-transparent to-accent/5" />
              <img
                src="/landing_placeholder.png"
                alt="Budget Copilot Dashboard"
                className="w-full rounded-lg relative z-10"
              />

              {/* Decorative corner elements */}
              <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-primary/20 rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-primary/20 rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-20 h-20 border-b-2 border-l-2 border-primary/20 rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-primary/20 rounded-br-2xl" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Badges Section */}
      <section className="border-y border-border/40 bg-muted/20 py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground mb-8">
            Trusted by thousands of users worldwide
          </p>
          <div className="mx-auto max-w-4xl grid grid-cols-3 gap-12 items-center justify-items-center opacity-40">
            {/* Placeholder for trust badges/stats */}
            <div className="text-2xl font-bold">10k+ Users</div>
            <div className="text-2xl font-bold">€2.5M Saved</div>
            <div className="text-2xl font-bold">10x+ ROI</div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="py-24 sm:py-32 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-0 top-1/3 h-[800px] w-[800px] rounded-full bg-primary/20 blur-[130px]" />
          <div className="absolute right-0 bottom-1/3 h-[700px] w-[700px] rounded-full bg-accent/15 blur-[110px]" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="mx-auto max-w-2xl text-center mb-20"
          >
            <h2 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
              Everything you need to save smarter
            </h2>
            <p className="text-lg text-muted-foreground">
              Smart features that make budgeting actually enjoyable (yes,
              really)
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="mx-auto max-w-6xl grid gap-8 md:grid-cols-3"
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="p-8 bg-muted/30 border-border/50 hover:bg-muted/40 transition-colors h-full">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-3 text-lg font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        id="testimonials"
        className="relative py-24 sm:py-32 bg-muted/20 overflow-hidden"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
              Loved by thousands of savers
            </h2>
            <p className="text-lg text-muted-foreground">
              Real people, real results, real talk about Budget Copilot
            </p>
          </motion.div>
        </div>

        <div className="mx-auto max-w-6xl px-4">
          <div className="relative h-[600px] overflow-hidden mask-[linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]">
            <div className="absolute inset-0 flex gap-4">
              {/* Column 1 - Fastest */}
              <motion.div
                animate={{ y: [0, -1000] }}
                transition={{
                  duration: 20,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'linear',
                }}
                className="flex-1 flex flex-col gap-4"
              >
                {[...column1, ...column1, ...column1].map((testimonial, i) => (
                  <Card
                    key={i}
                    className="p-6 bg-background/80 backdrop-blur-sm border-border/50 shrink-0"
                  >
                    <p className="text-sm text-foreground mb-4 leading-relaxed">
                      {testimonial.text}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {testimonial.author.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {testimonial.author}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {testimonial.handle}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </motion.div>

              {/* Column 2 - Medium speed */}
              <motion.div
                animate={{ y: [0, -1000] }}
                transition={{
                  duration: 30,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'linear',
                }}
                className="flex-1 flex flex-col gap-4 md:flex"
              >
                {[...column2, ...column2, ...column2].map((testimonial, i) => (
                  <Card
                    key={i}
                    className="p-6 bg-background/80 backdrop-blur-sm border-border/50 shrink-0"
                  >
                    <p className="text-sm text-foreground mb-4 leading-relaxed">
                      {testimonial.text}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {testimonial.author.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {testimonial.author}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {testimonial.handle}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </motion.div>

              {/* Column 3 - Slowest */}
              <motion.div
                animate={{ y: [0, -1000] }}
                transition={{
                  duration: 40,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'linear',
                }}
                className="flex-1 flex flex-col gap-4 lg:flex"
              >
                {[...column3, ...column3, ...column3].map((testimonial, i) => (
                  <Card
                    key={i}
                    className="p-6 bg-background/80 backdrop-blur-sm border-border/50 shrink-0"
                  >
                    <p className="text-sm text-foreground mb-4 leading-relaxed">
                      {testimonial.text}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {testimonial.author.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {testimonial.author}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {testimonial.handle}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[1000px] w-[1000px] rounded-full bg-primary/25 blur-[120px]" />
          <div className="absolute left-0 bottom-0 h-[600px] w-[600px] rounded-full bg-accent/20 blur-[90px]" />
          <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-primary/15 blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="mx-auto max-w-2xl text-center mb-12"
          >
            <h2 className="mb-4 text-4xl font-bold sm:text-5xl">
              Invest a little, save a lot
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Most folks save 10x the subscription cost within a few months. Not
              bad, right?
            </p>

            <div className="inline-flex items-center gap-3 rounded-full bg-muted/50 p-1">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`rounded-full px-6 py-2 text-sm font-medium transition-colors ${
                  billingPeriod === 'monthly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`rounded-full px-6 py-2 text-sm font-medium transition-colors ${
                  billingPeriod === 'yearly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                Yearly
                <Badge
                  className="ml-2 bg-primary/20 text-primary border-0"
                  variant="secondary"
                >
                  Save 17%
                </Badge>
              </button>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="mx-auto max-w-6xl grid gap-8 md:grid-cols-3 items-start"
          >
            {pricingPlans.map((plan, index) => {
              const displayPrice =
                billingPeriod === 'monthly'
                  ? plan.monthlyPrice
                  : plan.yearlyPrice / 12
              const showAnnualBilling =
                billingPeriod === 'yearly' && plan.yearlyPrice > 0

              return (
                <motion.div key={index} variants={fadeInUp}>
                  <Card
                    className={`p-8 ${
                      plan.popular
                        ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10'
                        : 'bg-muted/30 border-border/50'
                    }`}
                  >
                    {plan.popular && (
                      <Badge className="mb-4 bg-primary/20 text-primary border-0">
                        Popular
                      </Badge>
                    )}
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>

                    <div className="mb-1">
                      <span className="text-4xl font-bold">
                        €{displayPrice.toFixed(0)}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    {showAnnualBilling && (
                      <p className="text-sm text-muted-foreground mb-6">
                        Billed €{plan.yearlyPrice} annually
                      </p>
                    )}
                    {!showAnnualBilling && <div className="mb-6" />}

                    <Button
                      className="w-full mb-6"
                      variant={plan.popular ? 'default' : 'outline'}
                      size="lg"
                    >
                      Get Started
                    </Button>

                    <div className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                          <span className="text-sm text-muted-foreground">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        className="relative py-24 sm:py-32 bg-muted/20 overflow-hidden"
      >
        <div className="absolute inset-0 -z-10">
          <div className="absolute right-1/4 top-1/3 h-[800px] w-[800px] rounded-full bg-accent/20 blur-[100px]" />
          <div className="absolute left-1/4 bottom-1/4 h-[600px] w-[600px] rounded-full bg-primary/18 blur-[110px]" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="mx-auto max-w-2xl text-center mb-16"
          >
            <h2 className="mb-4 text-4xl font-bold sm:text-5xl">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about Budget Copilot
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="mx-auto max-w-3xl space-y-4"
          >
            {faqItems.map((faq, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Collapsible className="bg-card rounded-lg border border-border/50 overflow-hidden">
                  <CollapsibleTrigger className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/20 transition-colors group cursor-pointer">
                    <span className="font-semibold text-base pr-8">
                      {faq.question}
                    </span>
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform shrink-0 group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-6 pb-6">
                      <p className="text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-32 sm:py-40 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[1100px] w-[1100px] rounded-full bg-primary/30 blur-[130px]" />
          <div className="absolute right-1/4 bottom-1/4 h-[600px] w-[600px] rounded-full bg-accent/25 blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="mb-6 text-4xl font-bold sm:text-5xl lg:text-6xl">
              Ready to take control?
            </h2>
            <p className="mb-10 text-xl text-muted-foreground">
              Join thousands of happy savers who let Budget Copilot handle the
              money math
            </p>
            <Link href="/onboarding">
              <Button size="lg" className="rounded-full px-8 text-base h-12">
                Start your free trial
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <PieChart className="h-5 w-5 text-primary" />
              </div>
              <span className="text-lg font-bold">Budget Copilot</span>
            </div>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <Link
                href="/pricing"
                className="hover:text-foreground transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
