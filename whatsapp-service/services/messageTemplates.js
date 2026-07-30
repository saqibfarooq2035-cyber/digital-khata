function threeDaysBefore(name, amount, date) {
  return `السلام علیکم ${name} صاحب! 🌟
آپ کی قسط یاد دہانی:
قسط: Rs. ${amount}
تاریخ: ${date}

Dear ${name},
Your installment of Rs. ${amount} is due on ${date}.
Please pay on time. 🙏
— Digital Khata 📒`;
}

function dueToday(name, amount) {
  return `⚠️ یاد دہانی — آج کی قسط
${name} صاحب، آپ کی Rs. ${amount} کی قسط آج واجب الادا ہے۔

REMINDER: Dear ${name},
Your installment of Rs. ${amount} is DUE TODAY.
Please visit the shop or contact us.
📞 Call us if needed.
— Digital Khata 📒`;
}

function overdue(name, amount, days) {
  return `🔴 قسط باقی ہے — ${name} صاحب
آپ کی Rs. ${amount} کی قسط ${days} دن سے باقی ہے۔

Dear ${name}, your installment of Rs. ${amount}
is OVERDUE by ${days} days.
Please contact us immediately.
— Digital Khata 📒`;
}

function paymentReceived(name, amount, remaining) {
  return `✅ ادائیگی موصول — شکریہ!
${name} صاحب، Rs. ${amount} موصول ہوئے۔
باقی رقم: Rs. ${remaining}

Dear ${name}, payment of Rs. ${amount} received. ✅
Remaining balance: Rs. ${remaining}
Thank you! — Digital Khata 📒`;
}

module.exports = { threeDaysBefore, dueToday, overdue, paymentReceived };
