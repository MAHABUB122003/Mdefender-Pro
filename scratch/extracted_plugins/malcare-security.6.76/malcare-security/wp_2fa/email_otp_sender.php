<?php
if (!defined('ABSPATH')) exit;
if (!class_exists('MCWP2FAEmailOTPSender')) :
class MCWP2FAEmailOTPSender {
	public static function send($user, $code, $lifetime) {
		$template = new MCWP2FAEmailOTPTemplate($code, $lifetime);

		return wp_mail($user->user_email, $template->subject(), $template->body(), $template->headers());
	}
}
endif;
