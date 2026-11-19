<?php
/**
 * Plugin Name:       Maison Mellow 3D
 * Description:       La visite en 3D de la maison Maison Mellow (chaussons et bandeaux bouillottes), reliée à WooCommerce pour le panier et le paiement.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Maison Mellow
 * License:           GPL-2.0-or-later
 * Text Domain:       maison-mellow-3d
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'MM3D_VERSION', '1.0.0' );
define( 'MM3D_DIR', plugin_dir_path( __FILE__ ) );
define( 'MM3D_URL', plugin_dir_url( __FILE__ ) );
define( 'MM3D_TEMPLATE', 'maison-mellow-3d-visite.php' );

/**
 * Produits mis en scène dans la maison (mêmes identifiants que site/js/data/catalogue.js).
 */
function mm3d_produits() {
	return array(
		'chaussons-nuage'      => 'Chaussons bouillotte « Nuage »',
		'bandeau-cocon'        => 'Bandeau bouillotte multifonction « Cocon »',
		'nuque-douceur'        => 'Bouillotte nuque & épaules « Douceur »',
		'coffret-soiree-cocon' => 'Coffret « Soirée Cocon »',
		'housse-rechange'      => 'Housse de rechange',
	);
}

/* -------------------------------------------------------------------------
 * 1. Sur quelle page afficher la visite ?
 *    - la page choisie dans Réglages > Maison Mellow 3D,
 *    - ou une page qui utilise le modèle « Maison Mellow : visite 3D »,
 *    - ou une page qui contient le code court [maison_mellow_3d].
 * ---------------------------------------------------------------------- */
add_filter(
	'theme_page_templates',
	function ( $templates ) {
		$templates[ MM3D_TEMPLATE ] = 'Maison Mellow : visite 3D (plein écran)';
		return $templates;
	}
);

add_shortcode( 'maison_mellow_3d', '__return_empty_string' );

function mm3d_est_visite() {
	if ( ! is_singular() ) {
		return false;
	}
	$id = get_queried_object_id();
	if ( $id && (int) get_option( 'mm3d_page', 0 ) === $id ) {
		return true;
	}
	if ( get_page_template_slug( $id ) === MM3D_TEMPLATE ) {
		return true;
	}
	$post = get_post( $id );
	return $post && has_shortcode( $post->post_content, 'maison_mellow_3d' );
}

add_filter(
	'template_include',
	function ( $template ) {
		return mm3d_est_visite() ? MM3D_DIR . 'templates/visite-3d.php' : $template;
	},
	99
);

/* -------------------------------------------------------------------------
 * 2. Styles : ceux du site, et on retire ceux du thème sur la page de la visite
 *    (la visite a son propre design plein écran).
 * ---------------------------------------------------------------------- */
add_action(
	'wp_enqueue_scripts',
	function () {
		if ( ! mm3d_est_visite() ) {
			return;
		}
		wp_enqueue_style(
			'mm3d-polices',
			'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..700,100;1,9..144,300..700,100&family=Jost:wght@400;500;600&display=swap',
			array(),
			null
		);
		wp_enqueue_style( 'mm3d', MM3D_URL . 'site/css/style.css', array( 'mm3d-polices' ), MM3D_VERSION );
	},
	20
);

add_action(
	'wp_print_styles',
	function () {
		if ( ! mm3d_est_visite() ) {
			return;
		}
		$garder = array( 'mm3d', 'mm3d-polices', 'admin-bar', 'dashicons' );
		foreach ( wp_styles()->queue as $handle ) {
			if ( ! in_array( $handle, $garder, true ) ) {
				wp_dequeue_style( $handle );
			}
		}
	},
	100
);

/* -------------------------------------------------------------------------
 * 3. Réglages transmis au site (adresse des fichiers, WooCommerce…)
 * ---------------------------------------------------------------------- */
function mm3d_config() {
	$config = array(
		'base'   => MM3D_URL . 'site/',
		'config' => array(
			'livraisonOfferteDes' => (float) get_option( 'mm3d_seuil', 49 ),
			'fraisDePort'         => (float) get_option( 'mm3d_port', 4.9 ),
			'email'               => get_option( 'mm3d_email', get_option( 'admin_email' ) ),
		),
	);

	if ( class_exists( 'WooCommerce' ) && function_exists( 'wc_get_checkout_url' ) ) {
		$ids = array();
		foreach ( array_keys( mm3d_produits() ) as $slug ) {
			$ids[ $slug ] = (int) get_option( 'mm3d_id_' . $slug, 0 );
		}
		$config['woocommerce'] = array(
			'api'         => esc_url_raw( rest_url( 'wc/store/v1/' ) ),
			'nonce'       => wp_create_nonce( 'wc_store_api' ),
			'checkout'    => wc_get_checkout_url(),
			'cart'        => wc_get_cart_url(),
			'ids'         => $ids,
			'attrColoris' => get_option( 'mm3d_attr_coloris', 'Coloris' ),
			'attrTaille'  => get_option( 'mm3d_attr_taille', 'Pointure' ),
			'photos'      => (bool) get_option( 'mm3d_photos', 1 ),
		);
	}
	return $config;
}

/* -------------------------------------------------------------------------
 * 4. Page de réglages : Réglages > Maison Mellow 3D
 * ---------------------------------------------------------------------- */
add_action(
	'admin_init',
	function () {
		$texte  = array( 'sanitize_callback' => 'sanitize_text_field' );
		$entier = array( 'sanitize_callback' => 'absint' );
		$nombre = array(
			'sanitize_callback' => function ( $v ) {
				return max( 0, (float) str_replace( ',', '.', (string) $v ) );
			},
		);
		register_setting( 'mm3d', 'mm3d_page', $entier );
		register_setting( 'mm3d', 'mm3d_email', array( 'sanitize_callback' => 'sanitize_email' ) );
		register_setting( 'mm3d', 'mm3d_seuil', $nombre );
		register_setting( 'mm3d', 'mm3d_port', $nombre );
		register_setting( 'mm3d', 'mm3d_attr_coloris', $texte );
		register_setting( 'mm3d', 'mm3d_attr_taille', $texte );
		register_setting( 'mm3d', 'mm3d_photos', $entier );
		foreach ( array_keys( mm3d_produits() ) as $slug ) {
			register_setting( 'mm3d', 'mm3d_id_' . $slug, $entier );
		}
	}
);

add_action(
	'admin_menu',
	function () {
		add_options_page( 'Maison Mellow 3D', 'Maison Mellow 3D', 'manage_options', 'maison-mellow-3d', 'mm3d_page_reglages' );
	}
);

add_filter(
	'plugin_action_links_' . plugin_basename( __FILE__ ),
	function ( $liens ) {
		array_unshift( $liens, '<a href="' . esc_url( admin_url( 'options-general.php?page=maison-mellow-3d' ) ) . '">Réglages</a>' );
		return $liens;
	}
);

function mm3d_page_reglages() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$woo     = class_exists( 'WooCommerce' ) && function_exists( 'wc_get_products' );
	$choix   = $woo ? wc_get_products(
		array(
			'limit'   => 300,
			'status'  => 'publish',
			'orderby' => 'title',
			'order'   => 'ASC',
		)
	) : array();
	$page_id = (int) get_option( 'mm3d_page', 0 );
	?>
	<div class="wrap">
		<h1>Maison Mellow 3D</h1>
		<p>La visite 3D s'affiche en plein écran sur la page choisie ci-dessous. Pour en faire votre page d'accueil : <em>Réglages › Lecture › Une page statique</em>.</p>
		<?php if ( $page_id ) : ?>
			<p><a class="button" href="<?php echo esc_url( get_permalink( $page_id ) ); ?>" target="_blank" rel="noopener">Voir la visite 3D</a></p>
		<?php endif; ?>

		<form method="post" action="options.php">
			<?php settings_fields( 'mm3d' ); ?>

			<h2>Page de la visite</h2>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="mm3d_page">Page</label></th>
					<td>
						<?php
						wp_dropdown_pages(
							array(
								'name'              => 'mm3d_page',
								'id'                => 'mm3d_page',
								'selected'          => $page_id,
								'show_option_none'  => '— Choisir une page —',
								'option_none_value' => 0,
							)
						);
						?>
						<p class="description">Créez une page vide (par exemple « Accueil ») et choisissez-la ici.</p>
					</td>
				</tr>
			</table>

			<h2>Produits WooCommerce</h2>
			<?php if ( ! $woo ) : ?>
				<p><strong>WooCommerce n'est pas activé.</strong> Sans WooCommerce, le bouton « Commander » permet au client d'envoyer sa commande par email.</p>
			<?php else : ?>
				<p>Associez chaque produit de la maison à votre produit WooCommerce : les prix, promotions, stocks et photos viennent alors de WooCommerce, et le bouton « Commander » ouvre votre page de paiement.</p>
			<?php endif; ?>
			<table class="form-table" role="presentation">
				<?php foreach ( mm3d_produits() as $slug => $nom ) : ?>
					<?php $val = (int) get_option( 'mm3d_id_' . $slug, 0 ); ?>
					<tr>
						<th scope="row"><label for="mm3d_id_<?php echo esc_attr( $slug ); ?>"><?php echo esc_html( $nom ); ?></label></th>
						<td>
							<?php if ( $woo ) : ?>
								<select name="mm3d_id_<?php echo esc_attr( $slug ); ?>" id="mm3d_id_<?php echo esc_attr( $slug ); ?>">
									<option value="0">— Aucun —</option>
									<?php foreach ( $choix as $produit ) : ?>
										<option value="<?php echo esc_attr( $produit->get_id() ); ?>" <?php selected( $val, $produit->get_id() ); ?>>
											<?php echo esc_html( $produit->get_name() . ' (#' . $produit->get_id() . ')' ); ?>
										</option>
									<?php endforeach; ?>
								</select>
							<?php else : ?>
								<input type="number" min="0" name="mm3d_id_<?php echo esc_attr( $slug ); ?>" id="mm3d_id_<?php echo esc_attr( $slug ); ?>" value="<?php echo esc_attr( $val ); ?>" class="small-text">
							<?php endif; ?>
						</td>
					</tr>
				<?php endforeach; ?>
				<tr>
					<th scope="row"><label for="mm3d_attr_coloris">Nom de l'attribut couleur</label></th>
					<td>
						<input type="text" name="mm3d_attr_coloris" id="mm3d_attr_coloris" value="<?php echo esc_attr( get_option( 'mm3d_attr_coloris', 'Coloris' ) ); ?>">
						<p class="description">Pour les produits variables. Les valeurs doivent être les mêmes que sur le site : Crème, Caramel, Sauge, Rose poudré, Terracotta, Moka.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="mm3d_attr_taille">Nom de l'attribut pointure</label></th>
					<td>
						<input type="text" name="mm3d_attr_taille" id="mm3d_attr_taille" value="<?php echo esc_attr( get_option( 'mm3d_attr_taille', 'Pointure' ) ); ?>">
						<p class="description">Valeurs : 35-38, 39-42, 43-46.</p>
					</td>
				</tr>
				<tr>
					<th scope="row">Photos</th>
					<td>
						<input type="hidden" name="mm3d_photos" value="0">
						<label><input type="checkbox" name="mm3d_photos" value="1" <?php checked( (int) get_option( 'mm3d_photos', 1 ), 1 ); ?>> Afficher les photos des produits WooCommerce dans la boutique (à la place des rendus 3D)</label>
					</td>
				</tr>
			</table>

			<h2>Livraison et contact</h2>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="mm3d_seuil">Livraison offerte dès (€)</label></th>
					<td>
						<input type="text" name="mm3d_seuil" id="mm3d_seuil" value="<?php echo esc_attr( get_option( 'mm3d_seuil', 49 ) ); ?>" class="small-text">
						<p class="description">Utilisé pour la barre « Plus que X € pour la livraison offerte ». Mettez le même montant que dans WooCommerce.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="mm3d_port">Frais de port (€)</label></th>
					<td><input type="text" name="mm3d_port" id="mm3d_port" value="<?php echo esc_attr( get_option( 'mm3d_port', 4.9 ) ); ?>" class="small-text"></td>
				</tr>
				<tr>
					<th scope="row"><label for="mm3d_email">Email de contact</label></th>
					<td><input type="email" name="mm3d_email" id="mm3d_email" value="<?php echo esc_attr( get_option( 'mm3d_email', get_option( 'admin_email' ) ) ); ?>" class="regular-text"></td>
				</tr>
			</table>

			<?php submit_button(); ?>
		</form>
	</div>
	<?php
}
