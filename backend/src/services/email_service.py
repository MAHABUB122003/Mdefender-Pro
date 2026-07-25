"""
Email Service — Enterprise email validation and disposable domain blocking.

Three-layer validation pipeline:
1. RFC-compliant syntax validation (email-validator library)
2. DNS MX/A record verification (dnspython)
3. Disposable email domain detection (updatable set)

Reusable across registration, profile update, and invite flows.
Unit-testable: no database dependency.
"""

import logging
from typing import Dict, List, Optional, Set, Tuple

logger = logging.getLogger('mdefender.auth')


class EmailService:
    """
    Enterprise email validation service.

    OWASP-aligned: prevents registration with invalid, non-existent,
    or disposable email addresses.
    """

    def __init__(self):
        self._disposable_domains: Set[str] = self._load_disposable_domains()
        self._dns_available = self._check_dns_import()

    # ----------------------------------------------------------------
    # PUBLIC API
    # ----------------------------------------------------------------

    def validate(self, email: str) -> Dict[str, object]:
        """
        Full email validation pipeline. Runs all three layers.

        Returns:
            dict: {
                'valid': bool,
                'errors': List[str],
                'normalized_email': str (lowercase, stripped)
            }
        """
        errors: List[str] = []
        normalized = email.strip().lower()

        # Layer 1: RFC-compliant syntax
        syntax_ok, syntax_err = self.validate_syntax(normalized)
        if not syntax_ok:
            return {'valid': False, 'errors': [syntax_err], 'normalized_email': normalized}

        # Layer 2: Domain exists (MX / A records)
        domain_ok, domain_err = self.validate_domain(normalized)
        if not domain_ok:
            errors.append(domain_err)

        # Layer 3: Disposable email detection
        if self.is_disposable(normalized):
            errors.append("This email provider is not allowed.")
            logger.warning(f"Disposable email blocked: {normalized}")

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'normalized_email': normalized,
        }

    def validate_syntax(self, email: str) -> Tuple[bool, str]:
        """
        RFC-compliant email syntax validation using email-validator.

        Checks:
        - Valid email format (user@domain.tld)
        - ASCII / Unicode compliance
        - Length limits
        - Special character rules

        Returns:
            Tuple[bool, str]: (is_valid, error_message)
        """
        try:
            from email_validator import validate_email, EmailNotValidError
            v = validate_email(email, check_deliverability=False)
            # Return the normalized form from the library
            return True, ''
        except ImportError:
            # Fallback: basic regex validation if library not installed
            return self._fallback_syntax_check(email)
        except EmailNotValidError as e:
            return False, str(e)

    def validate_domain(self, email: str) -> Tuple[bool, str]:
        """
        Verify that the email domain exists via DNS.

        Priority:
        1. Check MX records (primary mail exchange)
        2. Fallback to A records (domain resolves to IP)

        Returns:
            Tuple[bool, str]: (is_valid, error_message)
        """
        if not self._dns_available:
            logger.warning("dnspython not installed — skipping DNS validation")
            return True, ''

        try:
            domain = email.split('@')[1]
        except (IndexError, AttributeError):
            return False, "Invalid email format"

        try:
            import dns.resolver
            dns.resolver.timeout = 3
            dns.resolver.lifetime = 5

            # Primary: check MX records
            try:
                mx_records = list(dns.resolver.resolve(domain, 'MX'))
                if mx_records:
                    return True, ''
            except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN,
                    dns.resolver.NoNameservers):
                pass
            except dns.resolver.LifetimeTimeout:
                logger.warning(f"DNS MX lookup timeout for {domain}")
                return True, ''  # Soft-fail: don't block on timeout

            # Fallback: check A records
            try:
                a_records = list(dns.resolver.resolve(domain, 'A'))
                if a_records:
                    return True, ''
            except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN,
                    dns.resolver.NoNameservers):
                pass
            except dns.resolver.LifetimeTimeout:
                return True, ''

            # No MX or A records found
            return False, (
                "Email domain does not exist or has no mail server. "
                "Please check your email address."
            )

        except ImportError:
            return True, ''
        except Exception as e:
            logger.error(f"DNS validation error for {email}: {e}")
            # Soft-fail on unexpected errors to avoid blocking legitimate registrations
            return True, ''

    def is_disposable(self, email: str) -> bool:
        """
        Check if email uses a known disposable/temporary email domain.

        The domain list is loaded once at init and can be updated
        via add_disposable_domain() / remove_disposable_domain().

        Returns:
            bool: True if domain is disposable
        """
        try:
            domain = email.split('@')[1].lower()
        except (IndexError, AttributeError):
            return False
        return domain in self._disposable_domains

    # ----------------------------------------------------------------
    # DOMAIN LIST MANAGEMENT
    # ----------------------------------------------------------------

    def add_disposable_domain(self, domain: str) -> None:
        """Add a domain to the disposable blocklist at runtime."""
        self._disposable_domains.add(domain.lower().strip())

    def remove_disposable_domain(self, domain: str) -> None:
        """Remove a domain from the disposable blocklist at runtime."""
        self._disposable_domains.discard(domain.lower().strip())

    def get_disposable_domains(self) -> Set[str]:
        """Return a copy of the current disposable domain set."""
        return self._disposable_domains.copy()

    def is_domain_disposable(self, domain: str) -> bool:
        """Check a domain directly (without full email address)."""
        return domain.lower().strip() in self._disposable_domains

    # ----------------------------------------------------------------
    # INTERNAL HELPERS
    # ----------------------------------------------------------------

    @staticmethod
    def _check_dns_import() -> bool:
        """Check if dnspython is available."""
        try:
            import dns.resolver
            return True
        except ImportError:
            return False

    @staticmethod
    def _fallback_syntax_check(email: str) -> Tuple[bool, str]:
        """Basic regex fallback if email-validator is not installed."""
        import re
        pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
        if re.match(pattern, email):
            return True, ''
        return False, "Invalid email address format"

    @staticmethod
    def _load_disposable_domains() -> Set[str]:
        """
        Load the disposable email domain blocklist.
        Returns a set for O(1) lookup performance.
        """
        return {
            # --- Major disposable email providers ---
            'mailinator.com', 'guerrillamail.com', 'guerrillamail.net',
            'guerrillamail.org', 'guerrillamail.de', 'guerrillamail.biz',
            'guerrillamail.info', 'guerrillamail.se', 'grr.la',
            'yopmail.com', 'yopmail.fr', 'yopmail.gq',
            'temp-mail.org', 'temp-mail.io', 'tempail.com', 'tempmail.com',
            'tempmailo.com', 'tempmailplus.com', 'tempmailer.com',
            'tempmailer.de', 'tempomail.fr', 'tempinbox.com',
            'tempinbox.co.uk', 'temporaryemail.net', 'temporaryemailaddress.com',
            'temporaryforwarding.com', 'temporaryinbox.com',
            '10minutemail.com', '10minutemail.co.za', '10minutemail.de',
            '10minutemail.net', '10minutemail.org',
            'throwamail.com', 'throwaway.email', 'throwawayemailaddresses.com',
            'trashmail.com', 'trashmail.net', 'trashmail.org', 'trashmail.me',
            'trashmail.at', 'trashmail.de', 'trashmail.ws', 'trash-mail.com',
            'trash-mail.de', 'trash-mail.fr', 'trash-mail.me', 'trash-mail.net',
            'trash-mail.at', 'trash-amil.com', 'trashemail.de', 'trashmailer.com',
            'trashymail.com', 'trashymail.net', 'trashymail.org',
            'trashdevil.com', 'trashdevil.de', 'trash2009.com',

            # --- Popular disposable services ---
            'maildrop.cc', 'mailsac.com', 'mohmal.com', 'mohmal.com.br',
            'getnada.com', 'emailondeck.com', 'discard.email',
            'dispostable.com', 'emz.net', 'fakeinbox.com',
            'harakirimail.com', 'hatesmail.com', 'jetable.org',
            'jetable.fr.nf', 'jetable.net', 'jetable.com',
            'nowmymail.com', 'mytemp.email', 'mytempemail.com',
            'proxymail.eu', 'rcpt.at', 'reallymymail.com',
            'recode.me', 'regbypass.com', 'safe-mail.net',
            'scatmail.com', 'skeefmail.com', 'slaskpost.se',
            'slipry.net', 'sogetthis.com', 'soodonims.com',
            'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org',
            'spamhole.com', 'spamify.com', 'spamfree24.org',
            'spamoff.de', 'superrito.com', 'supermailer.jp',
            'suremail.info', 'svk.jp', 'swissmail.com', 'swissmail.org',
            'syom.com', 'talkinator.com', 'teewars.org',
            'teleworm.us', 'teleworm.com', 'tempail.com',
            'tempalias.com', 'tempe56.com', 'tempemail.biz',
            'tempemail.co.za', 'tempemail.net', 'tempemail.org',
            'tempinbox.co.uk', 'tempomail.fr', 'temporaryemail.net',
            'temporaryemail.us', 'temporaryforwarding.com',
            'temporaryinbox.com', 'temporarymailaddress.com',
            'thankyou2010.com', 'thankyou2010.info',
            'thisisnotmyrealemail.com', 'tittbit.in',
            'tizi.com', 'tmailinator.com', 'toiea.com',
            'toolboksd.com', 'tradermail.info', 'trailertoo.com',
            'trentrue.com', 'trillianpro.com', 'tucanie.com',
            'turual.com', 'tvnet.lv', 'twasted.com',
            'u142.us', 'u2club.info', 'uggsrock.com',
            'umail.net', 'upliftnow.com', 'uplipht.com',
            'venompen.com', 'veryreally.net', 'vidaymimail.com',
            'vomoto.com', 'votiputox.com', 'vpn.st',
            'vsimcard.com', 'vubby.com', 'wanadoo.fr',
            'wasteland.rfc822.org', 'webemail.me',
            'weg-werf-email.de', 'wegwerfadresse.de',
            'wegwerfemail.at', 'wegwerfemail.de', 'wegwerfemail.net',
            'wegwerfemail.org', 'wegwerfmail.de', 'wegwerfmail.net',
            'wegwerfmail.org', 'wh4f.org', 'whatiaas.com',
            'whatpaas.com', 'whyspam.me', 'wikidocuslice.com',
            'wilemail.com', 'willhackforfood.biz',
            'willselfdestruct.com', 'winemaven.info',
            'wronghead.com', 'wuzup.net', 'wuzupmail.net',
            'wwwnew.eu', 'xagloo.com', 'xemaps.com',
            'xents.com', 'xjoi.com', 'xmaily.com',
            'xroguex.com', 'xtrafactory.com', 'xxhamsterxx.com',
            'yapped.net', 'yeah.net', 'yogamaven.com',
            'yomail.info', 'yopmail.com', 'yopmail.fr',
            'yopmail.gq', 'yopmail.net', 'yormentoring.org',
            'youngmail.info', 'yourtmt.com', 'yourt-mail.com',
            'ymail.com', 'zehnminutenmail.de', 'zippymail.info',
            'zoaxe.com', 'zoemail.org',

            # --- Less common but active ---
            'mailcatch.com', 'mailexpire.com', 'maillite.com',
            'mailmoat.com', 'mailnator.com', 'mailnesia.com',
            'mailnull.com', 'mailosaur.net', 'mailpick.biz',
            'mailproxsy.com', 'mailquack.com', 'mailshell.com',
            'mailsiphon.com', 'mailslite.com', 'mailtome.de',
            'mailtothis.com', 'mailtv.net', 'mailtv.tv',
            'mailzilla.com', 'mailzilla.org', 'mbx.cc',
            'mega.zik.dj', 'meinspamschutz.de', 'meltmail.com',
            'messagebeamer.de', 'mezimages.net', 'mfsa.ru',
            'mierdamail.com', 'migmail.pl', 'migumail.com',
            'mindless.com', 'ministry-of-silly-walks.de',
            'mintemail.com', 'misterpinball.de',
            'mmmmail.com', 'moakt.com', 'mobi.web.id',
            'mobimail.com', 'mobileninja.co.uk', 'mohmal.com',
            'moncourrier.fr.nf', 'monemail.fr.nf', 'monmail.fr.nf',
            'monumentmail.com', 'msa.minsmail.com',
            'mt2015.com', 'mx0.wwwnew.eu', 'my10minutemail.com',
            'myalias.pw', 'mycard.net.ua', 'mycleaninbox.net',
            'myemailboxy.com', 'mymail-in.net', 'mymailoasis.com',
            'mymailoasis.net', 'mymailoasis.org', 'mymailera.com',
            'mymailers.net', 'mymailx.info', 'myownemail.com',
            'myownemail.net', 'myownemail.org', 'myownier.com',
            'mypacks.net', 'mypartyclip.de', 'myphantom.com',
            'mysamp.de', 'myspaceinc.com', 'myspaceinc.net',
            'myspaceinc.org', 'myspacepimpedup.com',
            'mytempemail.com', 'mytempmail.com', 'mytempmail.org',
            'mytempmails.com', 'mytempinbox.com', 'mytempmail.org',
            'mytempemail.org', 'mytempmails.com',
            'netzide.com', 'neverbox.com', 'nice-4u.com',
            'nincsmail.hu', 'nnh.com', 'no-spam.ws',
            'nobulk.com', 'noclickemail.com', 'nogmailspam.info',
            'nomail.xl.cx', 'nomail2me.com', 'nomorespamemails.com',
            'nonspam.eu', 'nonspammer.de', 'noref.in',
            'nospam.ze.tc', 'nospam4.us', 'nospamfor.us',
            'nospammail.net', 'nospamthanks.info', 'nothingtoseehere.ca',
            'nowmymail.com', 'nurfuerspam.de',
            'nus.edu.sg', 'nwldx.com', 'objectmail.com',
            'obobbo.com', 'odnorazovoe.ru', 'oneoffemail.com',
            'onewaymail.com', 'oopi.org', 'ordinaryamerican.net',
            'otherinbox.com', 'ourklips.com', 'outlawspam.com',
            'ovpn.to', 'owlpic.com',
            'pancakemail.com', 'pimpedupmyspace.com',
            'pjjkp.com', 'plexolan.de', 'poczta.onet.pl',
            'pookmail.com', 'privacy.net', 'privatdemail.net',
            'proxymail.eu', 'prtnx.com', 'punkass.com',
            'putthisinyouremail.com', 'qq.com',
            'quickinbox.com', 'quickmail.nl',
            'rcpt.at', 'reallymymail.com', 'realtyalerts.ca',
            'recode.me', 'recursor.net', 'regbypass.com',
            'regbypass.comsafe-mail.net', 'rejectmail.com',
            'reliable-mail.com', 'rhyta.com', 'rklips.com',
            'rmqkr.net', 'royal.net', 'rppkn.com',
            'rtrtr.com', 's0ny.net', 'safe-mail.net',
            'safersignup.de', 'safetymail.info', 'safetypost.de',
            'sandelf.de', 'saynotospams.com', 'scatmail.com',
            'schafmail.de', 'schrott-email.de', 'secretemail.de',
            'secure-mail.biz', 'selfdestructingmail.com',
            'sendspamhere.com', 'shiftmail.com', 'shitmail.me',
            'shitmail.org', 'shitware.nl', 'shmeriously.com',
            'shortmail.net', 'sibmail.com', 'sinnlos-mail.de',
            'skeefmail.com', 'slaskpost.se', 'slipry.net',
            'slutty.horse', 'smap.ath.cx', 'smapfree24.com',
            'smapfree24.de', 'smapfree24.eu', 'smapfree24.info',
            'smapfree24.net', 'smapfree24.org', 'smashmail.de',
            'smellfear.com', 'snakemail.com', 'sneakemail.com',
            'sneakymail.de', 'snkmail.com', 'sofort-mail.de',
            'softpls.asia', 'sogetthis.com', 'soodonims.com',
            'spam.la', 'spam.su', 'spam4.me', 'spamavert.com',
            'spambob.com', 'spambob.net', 'spambob.org',
            'spambog.com', 'spambog.de', 'spambog.ru',
            'spambox.info', 'spambox.irishspringrealty.com',
            'spambox.us', 'spamcannon.com', 'spamcannon.net',
            'spamcero.com', 'spamcorptastic.com', 'spamcowboy.com',
            'spamcowboy.net', 'spamcowboy.org', 'spamday.com',
            'spamex.com', 'spamfighter.cf', 'spamfighter.ga',
            'spamfighter.gq', 'spamfighter.ml', 'spamfighter.tk',
            'spamfree.eu', 'spamfree24.com', 'spamfree24.de',
            'spamfree24.eu', 'spamfree24.info', 'spamfree24.net',
            'spamfree24.org', 'spamg.com', 'spamgourmet.com',
            'spamherelots.com', 'spamhereplease.com',
            'spamhole.com', 'spamify.com', 'spaminator.de',
            'spamkill.info', 'spaml.com', 'spaml.de',
            'spammotel.com', 'spamobox.com', 'spamoff.de',
            'spamslicer.com', 'spamspot.com', 'spamstack.net',
            'spamthis.co.uk', 'spamthisplease.com',
            'spamtrail.com', 'spamtrap.ro', 'speed.1s.fr',
            'spoofmail.de', 'stuffmail.de', 'superrito.com',
            'supermailer.jp', 'superplusplus.com', 'supervacu.com',
            'suremail.info', 'svk.jp', 'sweetxxx.de',
            'swift24.com', 'swissmail.com', 'swissmail.net',
            'swissmail.org', 'syom.com', 't2mail.com',
            'talkinator.com', 'tapchicuoihoi.com', 'teewars.org',
            'teleworm.com', 'teleworm.us', 'temp-mail.ru',
            'temp-mail.org', 'temp-mail.io', 'tempail.com',
            'tempano.com', 'tempalias.com', 'tempe56.com',
            'tempemail.biz', 'tempemail.co.za', 'tempemail.com',
            'tempemail.net', 'tempemail.org', 'tempemailer.com',
            'tempmailer.com', 'tempmailer.de', 'tempomail.fr',
            'temporaryemail.net', 'temporaryemail.us',
            'temporaryemailaddress.com', 'temporaryforwarding.com',
            'temporaryinbox.com', 'temporarymailaddress.com',
            'tempinbox.co.uk', 'tempinbox.com', 'tempmail.eu',
            'tempmail.it', 'tempmailo.com', 'tempmailer.com',
            'tempmailer.de', 'tempmail.net', 'tempmail.org',
            'tempmailapp.com', 'tempmaildu.com', 'tempmailinc.com',
            'tempmailo.com', 'tempmailonline.com', 'tempmailpro.com',
            'tempmailusa.com', 'tempmailz.com', 'tempmff.fr',
            'tempoutlook.com', 'tempr.email', 'temps-mail.com',
            'temps4free.com', 'tempsfs.com', 'tempsmail.com',
            'tempthe.net', 'tempymail.com', 'temp-zone.com',
            'thankyou2010.com', 'thankyou2010.info',
            'thankyou2010.net', 'thankyou2010.org',
            'thecloudindex.com', 'thetempmail.com',
            'thisisnotmyrealemail.com', 'throwamail.com',
            'throwawayemailaddresses.com', 'tittbit.in',
            'tizi.com', 'tmailinator.com', 'toiea.com',
            'tom.com', 'toomail.info', 'toolboksd.com',
            'topranklist.com', 'tradermail.info', 'trailertoo.com',
            'trash-amil.com', 'trash-mail.at', 'trash-mail.com',
            'trash-mail.de', 'trash-mail.fr', 'trash-mail.me',
            'trash-mail.net', 'trash2009.com', 'trashdevil.com',
            'trashdevil.de', 'trashemail.de', 'trashmail.at',
            'trashmail.com', 'trashmail.de', 'trashmail.me',
            'trashmail.net', 'trashmail.org', 'trashmail.ws',
            'trashmailer.com', 'trashmailer.net', 'trashmailo.com',
            'trashymail.com', 'trashymail.net', 'trashymail.org',
            'trialmail.info', 'trbvn.com', 'trentrue.com',
            'trillianpro.com', 'tucanie.com', 'turual.com',
            'tvnet.lv', 'twasted.com', 'u142.us',
            'u2club.info', 'uggsrock.com', 'umail.net',
            'upliftnow.com', 'uplipht.com', 'venompen.com',
            'veryreally.net', 'vidaymimail.com', 'vomoto.com',
            'votiputox.com', 'vpn.st', 'vsimcard.com',
            'vubby.com', 'wanadoo.fr', 'wasteland.rfc822.org',
            'webemail.me', 'weg-werf-email.de',
            'wegwerfadresse.de', 'wegwerfemail.at',
            'wegwerfemail.com', 'wegwerfemail.de',
            'wegwerfemail.net', 'wegwerfemail.org',
            'wegwerfmail.de', 'wegwerfmail.net',
            'wegwerfmail.org', 'wh4f.org', 'whatiaas.com',
            'whatpaas.com', 'whyspam.me', 'wickmail.net',
            'wikidocuslice.com', 'wilemail.com',
            'willhackforfood.biz', 'willselfdestruct.com',
            'winemaven.info', 'wronghead.com', 'wuzup.net',
            'wuzupmail.net', 'wwwnew.eu', 'xagloo.com',
            'xemaps.com', 'xents.com', 'xjoi.com',
            'xmaily.com', 'xroguex.com', 'xtrafactory.com',
            'xxxxx.xx', 'xxhamsterxx.com', 'yapped.net',
            'yeah.net', 'yogamaven.com', 'yomail.info',
            'yopmail.com', 'yopmail.fr', 'yopmail.gq',
            'yopmail.net', 'yormentoring.org', 'youngmail.info',
            'yourdomain.com', 'yourtmt.com', 'yourt-mail.com',
            'ypmail.webarnak.fr.eu.org', 'yuurok.com',
            'zehnminutenmail.de', 'zippymail.info',
            'zoaxe.com', 'zoemail.org',
        }
