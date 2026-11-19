<?php
/**
 * Page plein écran de la visite 3D Maison Mellow.
 * Le contenu vient de site/index.html (le même fichier que la version autonome du site).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$mm3d_html = file_get_contents( MM3D_DIR . 'site/index.html' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
$mm3d_body = '';
if ( $mm3d_html && preg_match( '#<body[^>]*>(.*)</body>#s', $mm3d_html, $mm3d_m ) ) {
	$mm3d_body = $mm3d_m[1];
}
// Le script du site est rechargé plus bas avec la bonne adresse
$mm3d_body = preg_replace( '#<script type="module" src="js/main\.js"></script>#', '', $mm3d_body );
// Images du site : adresse complète dans le dossier de l'extension
$mm3d_body = str_replace( 'src="assets/', 'src="' . esc_url( MM3D_URL . 'site/assets/' ), $mm3d_body );
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
	<meta name="theme-color" content="#f7ede1">
	<?php if ( ! current_theme_supports( 'title-tag' ) ) : ?>
		<title><?php echo esc_html( wp_get_document_title() ); ?></title>
	<?php endif; ?>
	<?php if ( ! has_site_icon() ) : ?>
		<link rel="icon" type="image/png" href="<?php echo esc_url( MM3D_URL . 'site/assets/favicon.png' ); ?>">
	<?php endif; ?>
	<?php wp_head(); ?>
</head>
<body <?php body_class( 'maison-mellow-3d' ); ?>>
<?php wp_body_open(); ?>
<?php echo $mm3d_body; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- contenu statique fourni par l'extension ?>
<script>window.MAISON_MELLOW = <?php echo wp_json_encode( mm3d_config() ); ?>;</script>
<script type="module" src="<?php echo esc_url( MM3D_URL . 'site/js/main.js?ver=' . MM3D_VERSION ); ?>"></script>
<?php wp_footer(); ?>
</body>
</html>
