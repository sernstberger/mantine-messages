import type { ChatMessage, MessagesUser } from 'mantine-messages';
import type { Agent, Customer, EmailItem, Ticket, TimelineItem } from './types';

export const SUPPORT_ADDRESS = 'support@lumen.example';

/** Tags the bulk and ticket actions offer */
export const TAGS = ['billing', 'bug', 'refund', 'api', 'vip', 'feature-request'];

export const agents: Agent[] = [
  { id: 'me', name: 'You' },
  { id: 'maya', name: 'Maya Lindqvist' },
  { id: 'theo', name: 'Theo Okafor' },
  { id: 'priya', name: 'Priya Raman' },
  { id: 'sam', name: 'Sam Whitaker' },
];

export const customers: Customer[] = [
  { id: 'nora', name: 'Nora Feld', email: 'nora@brightloop.example' },
  { id: 'luis', name: 'Luis Ortega', email: 'luis.ortega@hollow.example' },
  { id: 'aiko', name: 'Aiko Tanaka', email: 'aiko@paperplane.example' },
  { id: 'ben', name: 'Ben Carter', email: 'ben@carterco.example' },
  { id: 'fatima', name: 'Fatima Zahra', email: 'fz@northwind.example' },
  { id: 'jonas', name: 'Jonas Becker', email: 'jonas.becker@kiln.example' },
  { id: 'grace', name: 'Grace Liu', email: 'grace@orbit.example' },
  { id: 'omar', name: 'Omar Haddad', email: 'omar@saltmarsh.example' },
  { id: 'elena', name: 'Elena Rossi', email: 'elena.rossi@verde.example' },
  { id: 'kwame', name: 'Kwame Mensah', email: 'kwame@baobab.example' },
  { id: 'sofia', name: 'Sofia Novak', email: 'sofia@lumenfans.example' },
  { id: 'dev', name: 'Dev Patel', email: 'dev@quarry.example' },
];

/** Everyone who can write in a timeline, for names and avatars */
export const users: MessagesUser[] = [...agents, ...customers];

const MINUTE = 60 * 1000;

function timeline(ticketId: string, now: Date, customer: Customer) {
  const items: TimelineItem[] = [];
  const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * MINUTE);
  const next = () => `${ticketId}-${items.length + 1}`;

  return {
    items,
    email(minutesAgo: number, from: MessagesUser, subject: string, text: string) {
      const fromCustomer = from.id === customer.id;
      const email: EmailItem = {
        id: next(),
        kind: 'email',
        authorId: from.id,
        createdAt: at(minutesAgo),
        from: { name: from.name, address: fromCustomer ? customer.email : SUPPORT_ADDRESS },
        to: [fromCustomer ? SUPPORT_ADDRESS : customer.email],
        subject,
        text,
      };
      items.push(email);
      return email;
    },
    chat(minutesAgo: number, authorId: string, body: string) {
      const message: ChatMessage = { id: next(), authorId, body, createdAt: at(minutesAgo) };
      items.push(message);
    },
    note(minutesAgo: number, authorId: string, body: string) {
      items.push({
        id: next(),
        authorId,
        body,
        createdAt: at(minutesAgo),
        visibility: 'internal',
      });
    },
    event(minutesAgo: number, text: string) {
      items.push({
        id: next(),
        kind: 'event',
        authorId: 'system',
        text,
        createdAt: at(minutesAgo),
      });
    },
  };
}

const customer = (id: string) => customers.find((item) => item.id === id)!;

/** Twelve tickets whose timelines mix emails, chat, internal notes and events */
export function createTickets(now: Date): Ticket[] {
  const ago = (minutes: number) => new Date(now.getTime() - minutes * MINUTE);
  const due = (minutes: number) => new Date(now.getTime() + minutes * MINUTE);
  const base = { tags: [] as string[], snoozedUntil: null, assigneeId: null };

  const t1042 = timeline('T-1042', now, customer('nora'));
  const doubleCharge = t1042.email(
    95,
    customer('nora'),
    'Charged twice for the March invoice',
    'Hi,\n\nOur card was charged twice for invoice INV-2291 (USD 1,240.00 each, both on March 3).\nCan you refund the duplicate?\n\nThanks,\nNora Feld\nFinance, Brightloop'
  );
  doubleCharge.cc = ['ap@brightloop.example'];
  t1042.event(94, 'Ticket created from email');
  t1042.note(
    60,
    'maya',
    'Stripe shows two captures 4 seconds apart. Looks like the retry bug from last week.'
  );
  t1042.chat(12, 'nora', 'Hi, following up on my email about the double charge. Any news?');

  const t1041 = timeline('T-1041', now, customer('luis'));
  t1041.chat(80, 'luis', 'I reset my password and now it says my account is locked.');
  t1041.event(79, 'Maya Lindqvist assigned this to Theo Okafor');
  t1041.chat(70, 'theo', 'Sorry about that, Luis. Let me check your account.');
  t1041.note(68, 'theo', 'Locked after 5 failed attempts with the old password. Unlocking.');
  t1041.email(
    40,
    customer('luis'),
    'Re: Account locked',
    'Still locked on my side. I tried in a private window too.\n\nLuis'
  );

  const t1040 = timeline('T-1040', now, customer('aiko'));
  t1040.email(
    300,
    customer('aiko'),
    'CSV export drops accented characters',
    'Hello,\n\nWhen I export the contacts list to CSV, names like "José" come out as "Jos?".\nThis happens in Excel and Numbers.\n\nAiko'
  );
  t1040.note(250, 'priya', 'Reproduced. Export is written as Latin-1; filed BUG-881.');
  t1040.email(
    240,
    agents[3],
    'Re: CSV export drops accented characters',
    'Hi Aiko,\n\nThanks for the report, we could reproduce it. A fix is planned for next week; until then, "Export as XLSX" keeps the accents.\n\nPriya'
  );
  t1040.event(239, 'Priya Raman changed the status to Pending');

  const t1039 = timeline('T-1039', now, customer('ben'));
  t1039.chat(1500, 'ben', 'Any plans for a dark mode? My team works late.');
  t1039.event(1499, 'Ticket created from chat');
  t1039.note(1400, 'sam', 'Add to the dark mode feature request, 14 votes now.');
  t1039.email(
    1300,
    customer('ben'),
    'Dark mode',
    'Following up from chat: we would also love a high-contrast option.\n\nBen'
  );

  const t1038 = timeline('T-1038', now, customer('fatima'));
  t1038.email(
    50,
    customer('fatima'),
    'Webhook deliveries failing with 410',
    'Since this morning every delivery to https://hooks.northwind.example/lumen returns 410 on your side, according to the delivery log. Nothing changed on our end.\n\nFatima'
  );
  t1038.event(49, 'Theo Okafor changed the priority to Urgent');
  t1038.note(30, 'theo', 'The 410 comes from their proxy, not from us. Asking for proxy logs.');
  t1038.chat(10, 'fatima', 'Our ops team is online now if a call helps.');

  const t1037 = timeline('T-1037', now, customer('jonas'));
  t1037.chat(200, 'jonas', 'We want to move to the annual plan. Do we keep our current price?');
  t1037.note(180, 'sam', 'Eligible for the 2025 price lock. Sending a quote.');
  t1037.email(
    150,
    agents[4],
    'Your annual plan quote',
    'Hi Jonas,\n\nYour quote: 25 seats on the annual plan at your current price, USD 9,000 a year.\n\nSam'
  );

  const t1036 = timeline('T-1036', now, customer('grace'));
  t1036.email(
    2000,
    customer('grace'),
    'Refund for unused seats',
    'We removed 10 seats in February but were billed for 30 again in March. Please refund the difference.\n\nGrace'
  );
  t1036.email(
    1900,
    agents[1],
    'Re: Refund for unused seats',
    'Hi Grace,\n\nI have asked finance to refund 10 seats for March. You will see it in 5-10 business days.\n\nMaya'
  );
  t1036.note(1890, 'maya', 'Refund request REF-310 sent to finance.');
  t1036.event(1889, 'Maya Lindqvist changed the status to Pending');

  const t1035 = timeline('T-1035', now, customer('omar'));
  t1035.email(
    400,
    customer('omar'),
    'SSO setup with Okta',
    'We are setting up SSO with Okta. Which ACS URL and entity ID should we use?\n\nOmar'
  );
  t1035.event(399, 'Sam Whitaker assigned this to Theo Okafor');
  t1035.chat(
    300,
    'theo',
    'Hi Omar, I sent the SAML details by email. Ping me here if anything fails.'
  );
  t1035.note(290, 'theo', 'Saltmarsh is on the Enterprise trial; VIP.');

  const t1034 = timeline('T-1034', now, customer('elena'));
  t1034.email(
    3000,
    customer('elena'),
    'Change of invoice address',
    'Please send future invoices to our new office: Via Roma 12, 20121 Milano.\n\nElena'
  );
  t1034.note(2900, 'priya', 'Waiting for their VAT number before we can change it. Snoozed.');
  t1034.event(2899, 'Priya Raman snoozed this for two days');

  const t1033 = timeline('T-1033', now, customer('kwame'));
  t1033.chat(240, 'kwame', 'The Android app crashes as soon as I open it. Pixel 8, Android 15.');
  t1033.email(
    200,
    customer('kwame'),
    'Crash logs',
    'Here is what adb logcat shows:\n\nFATAL EXCEPTION: main\njava.lang.IllegalStateException: WebView not initialised\n\nKwame'
  );
  t1033.event(199, 'Ticket created from chat');
  t1033.note(150, 'me', 'Same stack trace as BUG-874. Mobile team is on it.');

  const t1032 = timeline('T-1032', now, customer('sofia'));
  t1032.chat(5000, 'sofia', 'How do I add a teammate to my workspace?');
  t1032.chat(4990, 'sam', 'Settings, then Members, then Invite. They get an email right away.');
  t1032.chat(4980, 'sofia', 'Found it, thanks!');
  t1032.event(4979, 'Sam Whitaker closed this');

  const t1031 = timeline('T-1031', now, customer('dev'));
  t1031.email(
    600,
    customer('dev'),
    'Data deletion request',
    'Under GDPR article 17, please delete all personal data you hold about me and confirm in writing.\n\nDev Patel'
  );
  t1031.note(550, 'me', 'Deletion job scheduled; legal wants the confirmation sent after it runs.');
  t1031.email(
    540,
    agents[0],
    'Re: Data deletion request',
    'Hi Dev,\n\nWe have scheduled the deletion of your data. We will confirm by email once it is complete, within 30 days.\n\nLumen Support'
  );
  t1031.event(539, 'You changed the status to Pending');

  const tickets: Ticket[] = [
    {
      ...base,
      id: 'T-1042',
      unread: true,
      subject: 'Charged twice for the March invoice',
      customerId: 'nora',
      status: 'open',
      priority: 'urgent',
      tags: ['billing'],
      createdAt: ago(95),
      slaDueAt: ago(20),
      items: t1042.items,
    },
    {
      ...base,
      id: 'T-1041',
      unread: true,
      subject: 'Account locked after password reset',
      customerId: 'luis',
      status: 'open',
      priority: 'high',
      assigneeId: 'theo',
      createdAt: ago(80),
      slaDueAt: due(45),
      items: t1041.items,
    },
    {
      ...base,
      id: 'T-1040',
      subject: 'CSV export drops accented characters',
      customerId: 'aiko',
      status: 'pending',
      priority: 'normal',
      assigneeId: 'priya',
      tags: ['bug'],
      createdAt: ago(300),
      slaDueAt: due(360),
      items: t1040.items,
    },
    {
      ...base,
      id: 'T-1039',
      unread: true,
      subject: 'Request: dark mode for the dashboard',
      customerId: 'ben',
      status: 'open',
      priority: 'low',
      tags: ['feature-request'],
      createdAt: ago(1500),
      slaDueAt: due(2880),
      items: t1039.items,
    },
    {
      ...base,
      id: 'T-1038',
      unread: true,
      subject: 'Webhook deliveries failing with 410',
      customerId: 'fatima',
      status: 'open',
      priority: 'urgent',
      assigneeId: 'me',
      tags: ['api', 'bug'],
      createdAt: ago(50),
      slaDueAt: due(15),
      items: t1038.items,
    },
    {
      ...base,
      id: 'T-1037',
      subject: 'Upgrade to the annual plan',
      customerId: 'jonas',
      status: 'open',
      priority: 'normal',
      assigneeId: 'sam',
      tags: ['billing'],
      createdAt: ago(200),
      slaDueAt: due(180),
      items: t1037.items,
    },
    {
      ...base,
      id: 'T-1036',
      subject: 'Refund for unused seats',
      customerId: 'grace',
      status: 'pending',
      priority: 'high',
      assigneeId: 'maya',
      tags: ['billing', 'refund'],
      createdAt: ago(2000),
      slaDueAt: due(1440),
      items: t1036.items,
    },
    {
      ...base,
      id: 'T-1035',
      subject: 'SSO setup with Okta',
      customerId: 'omar',
      status: 'open',
      priority: 'normal',
      assigneeId: 'theo',
      tags: ['vip'],
      createdAt: ago(400),
      slaDueAt: due(300),
      items: t1035.items,
    },
    {
      ...base,
      id: 'T-1034',
      subject: 'Change of invoice address',
      customerId: 'elena',
      status: 'open',
      priority: 'low',
      assigneeId: 'priya',
      tags: ['billing'],
      createdAt: ago(3000),
      slaDueAt: due(4000),
      snoozedUntil: due(2 * 24 * 60),
      items: t1034.items,
    },
    {
      ...base,
      id: 'T-1033',
      subject: 'Android app crashes on launch',
      customerId: 'kwame',
      status: 'open',
      priority: 'high',
      tags: ['bug'],
      createdAt: ago(240),
      slaDueAt: ago(120),
      items: t1033.items,
    },
    {
      ...base,
      id: 'T-1032',
      subject: 'How do I add a teammate?',
      customerId: 'sofia',
      status: 'closed',
      priority: 'low',
      assigneeId: 'sam',
      createdAt: ago(5000),
      slaDueAt: ago(4000),
      items: t1032.items,
    },
    {
      ...base,
      id: 'T-1031',
      subject: 'Data deletion request',
      customerId: 'dev',
      status: 'pending',
      priority: 'high',
      assigneeId: 'me',
      createdAt: ago(600),
      slaDueAt: due(2880),
      items: t1031.items,
    },
  ];

  return tickets;
}
