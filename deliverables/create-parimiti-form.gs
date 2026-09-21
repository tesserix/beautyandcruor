/**
 * Builds the "Questions for Parimiti" Google Form.
 *
 * HOW TO RUN
 *  1. Go to  script.google.com  and click  New project
 *  2. Delete whatever is in the editor, paste this whole file in
 *  3. Click  Run  (you'll be asked to authorise it once — that's Google asking
 *     permission for the script to create a form in your own Drive)
 *  4. Open  View > Logs  (or the Execution log) for the two links it prints:
 *       EDIT LINK    - yours, to change questions
 *       SHARE LINK   - send this one to Parimiti; no Google login required
 *
 * Responses land in the form's Responses tab and can be exported to Sheets.
 */
function createParimitiForm() {
  var form = FormApp.create('Questions for Parimiti \u2014 Beauty & Cruor website');

  form.setDescription(
    'Answers we need to finish the new site.\n\n' +
    'Questions marked Required are ones we genuinely cannot finish without \u2014 ' +
    'everything else can follow later. If you are not sure about something, leave it blank: ' +
    'blank is better than a guess.\n\n' +
    'You do not need a Google account, and you can stop and come back if you enable ' +
    '"Save progress" when prompted.');

  form.setCollectEmail(false);
  form.setProgressBar(true);
  form.setAllowResponseEdits(true);
  form.setLimitOneResponsePerUser(false);

  // Workspace accounts default to domain-only access; this opens it to anyone.
  // Throws on personal Gmail accounts, where forms are already public.
  try { form.setRequireLogin(false); } catch (e) {
    Logger.log('Note: setRequireLogin not applicable on this account type (' + e.message + ')');
  }


  // ---- Your credits ----
  form.addPageBreakItem().setTitle('Your credits').setHelpText('The most important section. Directors and producers read credits before anything else — and right now the list has no roles on it, which is the first thing they look for.');
  form.addTextItem().setTitle('What is the real title of the 2022 Village Roadshow job listed as "Mad max"?').setHelpText('Listed as: Mad max · Mad max films · Village roadshows · 2022 · Australia. We think this may be Furiosa: A Mad Max Saga, which shot in NSW around then — but we won\'t publish a guess against a Warner Bros. title. Please give the exact title from your call sheet or IMDb.').setRequired(true);
  form.addParagraphTextItem().setTitle('Which 6-8 productions should lead the site?').setHelpText('Sorted by date, the first things a film producer currently sees are baby-product commercials (Beco, Asian Paints, Himalaya, Sebamed, Johnson\'s). Strong work, wrong first impression for a features audience. Which titles do you want front and centre?').setRequired(true);
  form.addTextItem().setTitle('Johnson\'s Baby — which production company, and which year?').setHelpText('Your credits list says Mothership Production, 2025. Your own Instagram post credits DDB Mudra and Directors Cut, dated 2026. One is wrong and we don\'t know which.').setRequired(true);
  form.addParagraphTextItem().setTitle('Are the five 2026 credits released, or still under wraps?').setHelpText('Beco, Asian Paints, Himalaya Baby Care, Baby Sebamed and Johnson\'s are dated 2026. If any are unreleased or under NDA we should hold them back rather than announce them for you.');
  form.addParagraphTextItem().setTitle('Thief, Ola Cabs and Sugar box have no director or company. And "Lucky" shows "In Progress" where the director should be.').setHelpText('We can fill these in or leave them off. Is Lucky still in progress?');

  // ---- Your role on each production ----
  form.addPageBreakItem().setTitle('Your role on each production').setHelpText('A producer reads the role before the title. Use the wording from your call sheet or IMDb — e.g. Prosthetic Makeup Artist, Key Makeup Artist, Prosthetics Supervisor, Hair & Makeup. Leave blank any you\'re unsure of: blank is better than wrong.');
  form.addTextItem().setTitle('Asian Paints Commercial (2026)').setHelpText('Dir. Shayak Roy · BLTN · India');
  form.addTextItem().setTitle('Baby Sebamed Commercial (2026)').setHelpText('Dir. Indrasish Mukherjee · Leo Brunett · India');
  form.addTextItem().setTitle('Beco Commercial (2026)').setHelpText('Dir. Anirudh More · Dryfit production · India');
  form.addTextItem().setTitle('Himalaya Baby CARE Commercial (2026)').setHelpText('Dir. Dhara · Mothership Production · India');
  form.addTextItem().setTitle('Johnson Baby Commercial (2025)').setHelpText('Dir. Gaurav Gupta · Mothership Production · India');
  form.addTextItem().setTitle('Rakht Brahmand (2025)').setHelpText('Dir. Rahi Anil Barve · D2R Films · India');
  form.addTextItem().setTitle('The Bengal Files (2025)').setHelpText('Dir. Vivek Agnihotri · I am Buddha · India');
  form.addTextItem().setTitle('3 Monkeys - Poster (2024)').setHelpText('Dir. Abbas Mastan · AV Pictures · India');
  form.addTextItem().setTitle('Personal Trainer Web Series (2024)').setHelpText('Dir. Amit Khanna · A Square · India');
  form.addTextItem().setTitle('Hieruerark (2023)').setHelpText('Dir. Baro Lee · Australia');
  form.addTextItem().setTitle('ISSAC’S DREAM (2023)').setHelpText('Dir. ACM · Australia');
  form.addTextItem().setTitle('THE HOMESTEAD (2023)').setHelpText('Dir. Stephanie Todd · Australia');
  form.addTextItem().setTitle('Lucky (2022)').setHelpText('Australia');
  form.addTextItem().setTitle('Mad max (2022)').setHelpText('Dir. Mad max films · Village roadshows · Australia');
  form.addTextItem().setTitle('Thief (2022)').setHelpText('Australia');
  form.addTextItem().setTitle('Thinking Straight (2022)').setHelpText('Dir. Alex · Australia');
  form.addTextItem().setTitle('7th Sense (2021)').setHelpText('Dir. Karan Darra · Gaurang Doshi Productions · UAE');
  form.addTextItem().setTitle('Ola Cabs (2021)').setHelpText('India');
  form.addTextItem().setTitle('Danaher Corporate Commercial (2020)').setHelpText('Dir. Swapnil Kore · Clematis Communications Pvt Ltd · India');
  form.addTextItem().setTitle('HSBC Bank Commercial (2020)').setHelpText('Dir. Venky · Content Factory · India');
  form.addTextItem().setTitle('Panasonic A/C Commercial (2020)').setHelpText('Dir. Tejender Sharma · Gibbous Films · India');
  form.addTextItem().setTitle('Sugar box (2020)').setHelpText('India');
  form.addTextItem().setTitle('TMF Multi Asset Commercial (2020)').setHelpText('Dir. Content Factory · India');
  form.addTextItem().setTitle('Ek Brahm Sarvagun Sampanna (2019)').setHelpText('Dir. Sunny side up · India');
  form.addTextItem().setTitle('PUBG Originals - Dosti ka Naya Maidaan (2019-2020)').setHelpText('Dir. Raghav Subbu & Ruchir Arun · Content Factory · India');
  form.addTextItem().setTitle('Yaariyan Dildariyan Punjabi Feature Film (2019)').setHelpText('Dir. Dave Sidhu · Captain Cook Films · Australia');
  form.addTextItem().setTitle('Savadhan India (2018)').setHelpText('Dir. Bombay Show Studio · India');

  // ---- Getting booked ----
  form.addPageBreakItem().setTitle('Getting booked').setHelpText('We looked at around 30 comparable artist and studio sites. Almost none publish this information — which is exactly why putting it on yours would stand out. It\'s what a line producer needs before they can shortlist you.');
  form.addTextItem().setTitle('Which email address is correct?').setHelpText('The current site shows info@beautyandcruor.com in one place and info@beautycruor.com in another. If the wrong one is live, enquiries may have been bouncing. Worth checking today, separately from the rebuild.').setRequired(true);
  form.addTextItem().setTitle('A phone or WhatsApp number for the site?').setHelpText('Nobody on a production books through a web form — they call. If you\'d rather not publish a mobile, a WhatsApp business number works. Or say \'form only\'.').setRequired(true);
  form.addParagraphTextItem().setTitle('How many people can you bring, and in which city?').setHelpText('A producer costing a multi-appliance or crowd day needs a number. How many in Sydney, how many in Mumbai, and how much notice do you need?');
  form.addTextItem().setTitle('Turnaround: how many days from lifecast to first application?').setHelpText('This decides whether you make the shortlist for a shoot six weeks out. A range is fine.');
  form.addTextItem().setTitle('Current availability').setHelpText('None of your competitors publish this. A single line — \'Available from March, Mumbai\' — is genuinely rare. Only worth it if you\'ll keep it current; a stale one is worse than none.');
  form.addParagraphTextItem().setTitle('Insurance and compliance').setHelpText('Do you carry public liability insurance? A Working With Children Check? ABN and GST in Australia, GST in India? The WWCC matters — you have five baby-product commercials on your list and it\'s a real hiring criterion for that work.');

  // ---- What you actually offer ----
  form.addPageBreakItem().setTitle('What you actually offer').setHelpText('We\'re ordering the site prosthetics first, then makeup, then hair. A few things in your Instagram bio don\'t appear on the site at all.');
  form.addParagraphTextItem().setTitle('Do you still make and sell prosthetic appliances?').setHelpText('We know the Rahul Creations collaboration has ended. Are you still making appliances to sell independently, only for your own jobs, or not at all? This decides whether the site needs a shop section.').setRequired(true);
  form.addParagraphTextItem().setTitle('You teach. Should the site say so?').setHelpText('\'Educator\' is the first line of your Instagram bio and appears nowhere on your website. Do you want teaching enquiries — workshops, classes, mentoring — and if so, who for?');
  form.addParagraphTextItem().setTitle('Hair styling and nail art — in or out?').setHelpText('Both are in your Instagram bio; neither is on the site. Keeping them may bring work, or may dilute the prosthetics positioning for a film audience. Your call.');
  form.addParagraphTextItem().setTitle('What in-house capability should we list?').setHelpText('Lifecasting, clay sculpting, mould-making, running silicone / gelatine / foam latex, 3D-printed cores, application, hair, makeup — which do you do yourself, and what have we missed?');

  // ---- Images, film and rights ----
  form.addPageBreakItem().setTitle('Images, film and rights').setHelpText('We recovered 290 original images from the old site. Some are clearly behind-the-scenes or personal rather than portfolio.');
  form.addParagraphTextItem().setTitle('Is there anything in the old site\'s images that must NOT be published?').setHelpText('There are phone snapshots, behind-the-scenes shots and photos of other people mixed in with the portfolio work. We\'d rather you tell us than guess.').setRequired(true);
  form.addParagraphTextItem().setTitle('Do you have model and photographer releases?').setHelpText('Showing a before/after of a named actor\'s real face next to the character is a rights question, not a formality. Same for photographers\' images. Which shoots are you clear to publish?').setRequired(true);
  form.addParagraphTextItem().setTitle('Real titles and dates for the work we show').setHelpText('We\'ve been captioning images from what we can see — \'Burn appliance\', \'Creature sculpt\'. Those are our words, not yours. Each piece needs its real name, the production if any, and the year.').setRequired(true);
  form.addParagraphTextItem().setTitle('Do you have a showreel?').setHelpText('A reel above the fold is what almost every serious effects site leads with. We couldn\'t find a cut one — but your Instagram has around ten minutes of usable footage, including The Track parts 1 and 2 (122k and 79k plays) and The Saturation Point, which you co-directed. We can cut those into one reel if you don\'t have something better.');
  form.addParagraphTextItem().setTitle('Should the graphic work carry a warning, or sit behind an industry login?').setHelpText('You use trigger warnings on your own Instagram posts. Some effects studios keep their strongest material behind an industry login, which doubles as an exclusivity signal. Or we do nothing and let the work speak.');

  // ---- Reputation ----
  form.addPageBreakItem().setTitle('Reputation');
  form.addParagraphTextItem().setTitle('Can you get two or three quotes from directors or producers?').setHelpText('We checked around 30 comparable sites and not one had a single testimonial. It\'s standard in nearly every other professional service. Two or three attributed quotes would set you apart from every direct competitor. Even one is worth having.');
  form.addParagraphTextItem().setTitle('Is your IMDb profile up to date?').setHelpText('Producers treat IMDb as the record. If the site lists credits your IMDb doesn\'t, that gap gets noticed. We\'ll link to it prominently either way.');

  // ---- Name and logo ----
  form.addPageBreakItem().setTitle('Name and logo');
  form.addTextItem().setTitle('Parimiti or Parimitii?').setHelpText('Your Instagram display name reads \'Parimitii\' with two i\'s; the credit inside your own post reads \'Parimiti\'. We need the correct spelling before it goes on a masthead.').setRequired(true);
  form.addParagraphTextItem().setTitle('How attached are you to the current logo?').setHelpText('We\'ve redrawn it as clean vector so it\'s sharp at any size — that part is done. Honest view: the script-and-leaf mark reads closer to a wellness or beauty salon than to prosthetics and trauma work, and it sits awkwardly next to your strongest images. Options: keep as is, keep but drop the green, or set your name in type and retire the mark.');

  // ---- Anything else ----
  form.addPageBreakItem().setTitle('Anything else');
  form.addParagraphTextItem().setTitle('What do you want this site to do for you?').setHelpText('We\'ve assumed the job is getting booked by directors and producers. If you\'re also chasing teaching, appliance sales, or a different kind of work, that changes what goes first.');
  form.addParagraphTextItem().setTitle('Anything we haven\'t asked?');

  Logger.log('EDIT LINK :  ' + form.getEditUrl());
  Logger.log('SHARE LINK:  ' + form.getPublishedUrl());
  return form.getPublishedUrl();
}
