const { validateEmail } = require('../src/services/emailValidator');

describe('EmailValidator Service', () => {
  describe('Valid Original Emails', () => {
    it('accepts legitimate Gmail addresses', async () => {
      const res = await validateEmail('kavignar.bharathi@gmail.com');
      expect(res.isValid).toBe(true);
    });

    it('accepts legitimate Yahoo and Outlook addresses', async () => {
      const yahoo = await validateEmail('writer@yahoo.com');
      const outlook = await validateEmail('poet@outlook.com');
      expect(yahoo.isValid).toBe(true);
      expect(outlook.isValid).toBe(true);
    });

    it('accepts legitimate Zoho and ProtonMail addresses', async () => {
      const zoho = await validateEmail('editor@zoho.com');
      const proton = await validateEmail('artist@proton.me');
      expect(zoho.isValid).toBe(true);
      expect(proton.isValid).toBe(true);
    });
  });

  describe('Disposable & Fake Emails', () => {
    it('rejects mailinator disposable emails', async () => {
      const res = await validateEmail('fakeuser123@mailinator.com');
      expect(res.isValid).toBe(false);
      expect(res.code).toBe('INVALID_EMAIL');
      expect(res.message).toMatch(/fake or disposable/i);
    });

    it('rejects tempmail disposable emails', async () => {
      const res = await validateEmail('random@tempmail.com');
      expect(res.isValid).toBe(false);
      expect(res.code).toBe('INVALID_EMAIL');
    });

    it('rejects yopmail and 10minutemail', async () => {
      const yop = await validateEmail('test@yopmail.com');
      const ten = await validateEmail('test@10minutemail.com');
      expect(yop.isValid).toBe(false);
      expect(ten.isValid).toBe(false);
    });

    it('rejects dummy test.com and fake.com emails', async () => {
      const testCom = await validateEmail('user@test.com');
      const fakeCom = await validateEmail('user@fake.com');
      expect(testCom.isValid).toBe(false);
      expect(fakeCom.isValid).toBe(false);
    });
  });

  describe('Invalid Formats', () => {
    it('rejects malformed email strings', async () => {
      const empty = await validateEmail('');
      const noAt = await validateEmail('plainaddress');
      const noDomain = await validateEmail('user@');
      const noUser = await validateEmail('@domain.com');

      expect(empty.isValid).toBe(false);
      expect(noAt.isValid).toBe(false);
      expect(noDomain.isValid).toBe(false);
      expect(noUser.isValid).toBe(false);
    });
  });
});
