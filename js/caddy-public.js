(function( $ ) {
	'use strict';

	//=============================================================================
	// GLOBAL VARIABLES
	//=============================================================================
	var ccWindow = $( '.cc-window' );
	var cc_quanity_update_send = true;

	//=============================================================================
	// UTILITY FUNCTIONS
	//=============================================================================
	
	/**
	 * Generate skeleton HTML for cart items loading state
	 * 
	 * @param {number|null} customCount - Optional custom number of skeleton items to display
	 * @return {string} HTML string containing skeleton loaders
	 */
	function getSkeletonHTML(customCount) {
		const cartCount = customCount || parseInt($('.cc-compass-count').text()) || 1;
		
		const skeletonItem = `
		<div class="cc-skeleton-item">
			<div class="cc-skeleton cc-skeleton-thumb"></div>
			<div class="cc-skeleton-content">
				<div class="cc-skeleton cc-skeleton-line medium"></div>
				<div class="cc-skeleton cc-skeleton-line short"></div>
			</div>
		</div>
		`;
		
		return skeletonItem.repeat(cartCount);
	}
	
	//=============================================================================
	// CART MANAGEMENT FUNCTIONS
	//=============================================================================
	
	/**
	 * Load and display the cart screen with updated fragments
	 * 
	 * @param {string} productAdded - Optional parameter indicating if a product was added ('yes' or 'move_to_cart')
	 */
	function cc_cart_screen(productAdded = '') {
		let ajaxUrl;
		if (cc_ajax_script.wc_ajax_url) {
			ajaxUrl = cc_ajax_script.wc_ajax_url.replace('%%endpoint%%', 'get_refreshed_fragments');
		} else {
			ajaxUrl = '/?wc-ajax=get_refreshed_fragments';
		}

		if (window.cc_cart_ajax && window.cc_cart_ajax.readyState !== 4) {
			window.cc_cart_ajax.abort();
		}

		window.cc_cart_ajax = $.ajax({
			type: 'post',
			url: ajaxUrl,
			beforeSend: function(xhr, settings) {
				$('.cc-cart-items').html(getSkeletonHTML());
			},
			error: function(xhr, status, error) {
				if (status !== 'abort') {
					if (status !== 'abort') {
						$('.cc-cart-items').html('<div class="cc-cart-error">Unable to load cart. <a href="' + cc_ajax_script.cart_url + '">View cart page</a>.</div>');
					}
				}
			},
			success: function(response) {
				var fragments = response.fragments;
				if (fragments) {
					$.each(fragments, function(key, value) {
						$(key).replaceWith(value);
					});
					$(document.body).trigger('wc_fragments_refreshed');
				}

				var tabs = new Tabby('[data-tabs]');
				tabs.toggle('#cc-cart');

				if ('yes' == productAdded) {
					$('.cc-window-wrapper').hide();
				}

				if ('move_to_cart' === productAdded) {
					$('.cc_cart_from_sfl').removeClass('cc_hide_btn');
					$('.cc_cart_from_sfl').parent().find('.cc-loader').hide();
					$('.cc-coupon .woocommerce-notices-wrapper').remove();
					$('.cc-cart').removeAttr('hidden');
				}
			}
		});
	}

	/**
	 * Update item quantity in the cart
	 * Handles quantity increment and decrement buttons
	 * 
	 * @param {Object} el - The button element that was clicked
	 */
	function cc_quantity_update_buttons(el) {
		if (cc_quanity_update_send) {
			cc_quanity_update_send = false;
			$('.cc-notice').hide();
			var wrap = $(el).parents('.cc-cart-product-list');
			var input = $(wrap).find('.cc_item_quantity');
			var key = $(input).data('key');
			var productID = $(input).data('product_id');
			var number = parseInt($(input).val());
			var type = $(el).data('type');
			if ('minus' == type) {
				number--;
			} else {
				number++;
			}
			if (number < 1) {
				number = 1;
			}
			var data = {
				key: key,
				number: number,
				product_id: productID,
				security: cc_ajax_script.nonce
			};

			let ajaxUrl;
			if (cc_ajax_script.wc_ajax_url) {
				ajaxUrl = cc_ajax_script.wc_ajax_url.replace('%%endpoint%%', 'cc_quantity_update');
			} else {
				ajaxUrl = '/?wc-ajax=cc_quantity_update';
			}

			var currentCartHTML = $('.cc-cart-items').html();

			$('.cc-cart-items').html(getSkeletonHTML());

			$.ajax({
				type: 'post',
				url: ajaxUrl,
				data: data,
				success: function(response) {
					var fragments = response.fragments,
						qty_error_msg = response.qty_error_msg;

					if (qty_error_msg) {
						$('.cc-cart-items').html(currentCartHTML);
						$('.cc-notice').addClass('cc-error').show().html(qty_error_msg);
						setTimeout(function() {
							$('.cc-notice').removeClass('cc-error').html('').hide();
						}, 2000);
					} else if (fragments) {
						$.each(fragments, function(key, value) {
							$(key).replaceWith(value);
						});

						$(document.body).trigger('wc_fragments_refreshed');
					}

					$(input).val(number);
					cc_quanity_update_send = true;

					var tabs = new Tabby('[data-tabs]');
					tabs.toggle('#cc-cart');
				},
				error: function() {
					$('.cc-cart-items').html(currentCartHTML);
					cc_quanity_update_send = true;
				}
			});
		}
	}

	/**
	 * Remove an item from the cart
	 * 
	 * @param {Object} button - The remove button that was clicked
	 */
	function cc_remove_item_from_cart(button) {
		var cartItemKey = button.data('cart_item_key'),
			productName = button.data('product_name'),
			product_id = button.data('product_id');

		let ajaxUrl;
		if (cc_ajax_script.wc_ajax_url) {
			ajaxUrl = cc_ajax_script.wc_ajax_url.replace('%%endpoint%%', 'cc_remove_item_from_cart');
		} else {
			ajaxUrl = '/?wc-ajax=cc_remove_item_from_cart';
		}

		var currentCartHTML = $('.cc-cart-items').html();

		const currentCount = parseInt($('.cc-compass-count').text()) || 1;
		const skeletonCount = Math.max(currentCount - 1, 1);

		$.ajax({
			type: 'post',
			url: ajaxUrl,
			data: {
				nonce: cc_ajax_script.nonce,
				cart_item_key: cartItemKey
			},
			beforeSend: function(response) {
				$('.cc-cart-items').html(getSkeletonHTML(skeletonCount));
				$('.cc-compass .ccicon-cart').hide();
				$('.cc-compass .cc-loader').show();
			},
			complete: function(response) {
				$('.cc-compass .ccicon-cart').show();
				$('.cc-compass .cc-loader').hide();

				if (($('.single_add_to_cart_button, .add_to_cart_button').length > 0)) {
					$('.single_add_to_cart_button.added, .add_to_cart_button.added').each(function() {
						if ($('form.cart').length > 0 && !$(this).hasClass('add_to_cart_button')) {
							var $form = $(this).closest('form.cart'),
								atc_product_id = $form.find('input[name=add-to-cart]').val() || $(this).val(),
								atc_variation_id = $form.find('input[name=variation_id]').val() || 0;
							if (atc_variation_id !== 0) {
								atc_product_id = atc_variation_id;
							}
						} else {
							var atc_product_id = $(this).data('product_id');
						}
						if (atc_product_id == product_id) {
							if ($(this).hasClass('added')) {
								$(this).removeClass('added');
							}
						}
					});
				}
			},
			success: function(response) {
				var fragments = response.fragments;
				if (fragments) {
					$.each(fragments, function(key, value) {
						$(key).replaceWith(value);
					});

					$(document.body).trigger('wc_fragments_refreshed');
				}

				var tabs = new Tabby('[data-tabs]');
				tabs.toggle('#cc-cart');
			},
			error: function() {
				$('.cc-cart-items').html(currentCartHTML);
			}
		});
	}

	/**
	 * Display the cart items list in the cart window
	 */
	function cc_cart_item_list() {
		if ( !ccWindow.hasClass( 'visible' ) ) {
			$( '.cc-compass' ).trigger( 'click' );
		}
	}

	/**
	 * Refresh the cart contents via AJAX
	 * Gets updated fragments and refreshes the cart display
	 */
	function cc_refresh_cart() {
		let ajaxUrl;
		if (cc_ajax_script.wc_ajax_url) {
			ajaxUrl = cc_ajax_script.wc_ajax_url.replace('%%endpoint%%', 'get_refreshed_fragments');
		} else {
			ajaxUrl = '/?wc-ajax=get_refreshed_fragments';
		}

		if (window.cc_refresh_ajax && window.cc_refresh_ajax.readyState !== 4) {
			window.cc_refresh_ajax.abort();
		}

		window.cc_refresh_ajax = $.ajax({
			type: 'post',
			url: ajaxUrl,
			success: function(response) {
				if (response.fragments) {
					$.each(response.fragments, function(key, value) {
						$(key).replaceWith(value);
					});

					$(document.body).trigger('wc_fragments_refreshed');
				}
			},
			error: function(xhr, status, error) {
				if (status !== 'abort') {
					$('.cc-cart-items').html('<div class="cc-cart-error">Unable to refresh cart. <a href="javascript:void(0)" onclick="cc_refresh_cart()">Try again</a>.</div>');
				}
			}
		});
	}

	//=============================================================================
	// COUPON MANAGEMENT FUNCTIONS
	//=============================================================================

	/**
	 * Apply a coupon code from the cart screen
	 */
	function cc_coupon_code_applied_from_cart_screen() {
		var coupon_code = $('.cc-coupon-form #cc_coupon_code').val();

		let ajaxUrl;
		if (cc_ajax_script.wc_ajax_url) {
			ajaxUrl = cc_ajax_script.wc_ajax_url.replace('%%endpoint%%', 'cc_apply_coupon_to_cart');
		} else {
			ajaxUrl = '/?wc-ajax=cc_apply_coupon_to_cart';
		}

		var data = {
			nonce: cc_ajax_script.nonce,
			coupon_code: coupon_code
		};

		$.ajax({
			type: 'post',
			url: ajaxUrl,
			data: data,
			beforeSend: function(response) {
				$('#cc-cart').css('opacity', '0.3');
			},
			complete: function(response) {
				$('#cc-cart').css('opacity', '1');
			},
			success: function(response) {
				var fragments = response.fragments,
					caddy_cart_subtotal = response.caddy_cart_subtotal;

				if (fragments) {
					$.each(fragments, function(key, value) {
						$(key).replaceWith(value);
					});

					$(document.body).trigger('wc_fragments_refreshed');
				}

				$('.cc-total-amount').html(caddy_cart_subtotal);

				var tabs = new Tabby('[data-tabs]');
				tabs.toggle('#cc-cart');
			}
		});
	}

	/**
	 * Remove a coupon code from the cart screen
	 * 
	 * @param {Object} $remove_code - The remove coupon button that was clicked
	 */
	function cc_coupon_code_removed_from_cart_screen($remove_code) {
		var coupon_code_to_remove = $remove_code.parent('.cc-applied-coupon').find('.cc_applied_code').text();

		let ajaxUrl;
		if (cc_ajax_script.wc_ajax_url) {
			ajaxUrl = cc_ajax_script.wc_ajax_url.replace('%%endpoint%%', 'cc_remove_coupon_code');
		} else {
			ajaxUrl = '/?wc-ajax=cc_remove_coupon_code';
		}

		var data = {
			nonce: cc_ajax_script.nonce,
			coupon_code_to_remove: coupon_code_to_remove
		};

		$.ajax({
			type: 'post',
			url: ajaxUrl,
			data: data,
			beforeSend: function(response) {
				$('#cc-cart').css('opacity', '0.3');
			},
			complete: function(response) {
				$('#cc-cart').css('opacity', '1');
			},
			success: function(response) {
				var fragments = response.fragments,
					fs_title = response.free_shipping_title,
					fs_meter = response.free_shipping_meter,
					final_cart_subtotal = response.final_cart_subtotal;

				if (fragments) {
					$.each(fragments, function(key, value) {
						$(key).replaceWith(value);
					});

					$(document.body).trigger('wc_fragments_refreshed');
				}

				$('.cc-fs-title').html(fs_title);
				$('.cc-fs-meter').html(fs_meter);
				$('.cc-total-amount').html(final_cart_subtotal);

				var tabs = new Tabby('[data-tabs]');
				tabs.toggle('#cc-cart');
			}
		});
	}

	//=============================================================================
	// SAVE FOR LATER FUNCTIONALITY
	//=============================================================================

	/**
	 * Save an item for later
	 * Moves an item from the cart to the save-for-later list
	 * 
	 * @param {Object} $button - The save for later button that was clicked
	 */
	function cc_save_for_later($button) {
		var product_id = $button.data('product_id');
		var cart_item_key = $button.data('cart_item_key');

		let ajaxUrl;
		if (cc_ajax_script.wc_ajax_url) {
			ajaxUrl = cc_ajax_script.wc_ajax_url.replace('%%endpoint%%', 'cc_save_for_later');
		} else {
			ajaxUrl = '/?wc-ajax=cc_save_for_later';
		}

		var data = {
			security: cc_ajax_script.nonce,
			product_id: product_id,
			cart_item_key: cart_item_key
		};

		$.ajax({
			type: 'post',
			dataType: 'json',
			url: ajaxUrl,
			data: data,
			beforeSend: function(response) {
				$('#cc-cart').css('opacity', '0.3');
				$button.addClass('cc_hide_btn');
				$button.parent().find('.cc-loader').show();
			},
			complete: function(response) {
				$button.removeClass('cc_hide_btn');
				$button.parent().find('.cc-loader').hide();
				$('#cc-cart').css('opacity', '1');
			},
			success: function(response) {
				var fragments = response.fragments;
				if (fragments) {
					$.each(fragments, function(key, value) {
						$(key).replaceWith(value);
					});

					$(document.body).trigger('wc_fragments_refreshed');
				}

				var tabs = new Tabby('[data-tabs]');
				tabs.toggle('#cc-saves');
			}
		});
	}

	/**
	 * Move an item from save-for-later to cart
	 * 
	 * @param {Object} $button - The move to cart button that was clicked
	 */
	function cc_move_to_cart($button) {
		var product_id = $button.data('product_id');

		let ajaxUrl;
		if (cc_ajax_script.wc_ajax_url) {
			ajaxUrl = cc_ajax_script.wc_ajax_url.replace('%%endpoint%%', 'cc_move_to_cart');
		} else {
			ajaxUrl = '/?wc-ajax=cc_move_to_cart';
		}

		var data = {
			security: cc_ajax_script.nonce,
			product_id: product_id,
		};

		$.ajax({
			type: 'post',
			dataType: 'json',
			url: ajaxUrl,
			data: data,
			beforeSend: function(response) {
				$button.addClass('cc_hide_btn');
				$button.parent().find('.cc-loader').show();
			},
			success: function(response) {
				if (response.error) {
					$button.removeClass('cc_hide_btn');
					$button.parent().find('.cc-loader').hide();

					var tabs = new Tabby('[data-tabs]');
					tabs.toggle('#cc-saves');

					$('.cc-sfl-notice').show().html(response.error_message);
					setTimeout(function() {
							$('.cc-sfl-notice').html('').hide();
						},
						2000);
				} else {
					cc_cart_screen('move_to_cart');
				}
			}
		});
	}

	/**
	 * Remove an item from the save-for-later list
	 * 
	 * @param {Object} button - The remove button that was clicked
	 */
	function cc_remove_item_from_save_for_later(button) {
		var productID = button.data('product_id');

		let ajaxUrl;
		if (cc_ajax_script.wc_ajax_url) {
			ajaxUrl = cc_ajax_script.wc_ajax_url.replace('%%endpoint%%', 'cc_remove_item_from_sfl');
		} else {
			ajaxUrl = '/?wc-ajax=cc_remove_item_from_sfl';
		}

		var data = {
			nonce: cc_ajax_script.nonce,
			product_id: productID
		};

		$.ajax({
			type: 'post',
			url: ajaxUrl,
			data: data,
			beforeSend: function(response) {
				$('#cc-saves').css('opacity', '0.3');
			},
			complete: function(response) {
				$('#cc-saves').css('opacity', '1');
			},
			success: function(response) {
				var fragments = response.fragments;
				if (fragments) {
					$.each(fragments, function(key, value) {
						$(key).replaceWith(value);
					});

					$(document.body).trigger('wc_fragments_refreshed');
				}

				var sfl_btn = $('a.cc-sfl-btn.remove_from_sfl_button');
				if (sfl_btn.has('i.ccicon-heart-filled')) {
					sfl_btn.find('i').removeClass('ccicon-heart-filled').addClass('ccicon-heart-empty');
					var sfl_btn_text = sfl_btn.find('span').text();
					if (sfl_btn_text.length > 0) {
						sfl_btn.find('span').text('Save for later');
					}
					sfl_btn.removeClass('remove_from_sfl_button').addClass('cc_add_product_to_sfl');
				}

				var tabs = new Tabby('[data-tabs]');
				tabs.toggle('#cc-saves');
			}
		});
	}

	/**
	 * Display the saved items list in the cart window
	 */
	function cc_saved_item_list() {
		$( '.cc-compass' ).toggleClass( 'cc-compass-open' );
		$( 'body' ).toggleClass( 'cc-window-open' );

		$( '.cc-pl-info-container' ).hide();
		$( '.cc-window-wrapper' ).show();

		$( '.cc-overlay' ).show();

		var tabs = new Tabby( '[data-tabs]' );
		tabs.toggle( '#cc-saves' );

		ccWindow.animate( { 'right': '0' }, 'slow' ).addClass( 'visible' );
	}

	/**
	 * Navigate back to cart from product info view
	 */
	function cc_back_to_cart() {
		$( '.cc-pl-info-container' ).hide();
		$( '.cc-window-wrapper' ).show();
	}

	//=============================================================================
	// DOCUMENT READY - EVENT HANDLERS & INITIALIZATION
	//=============================================================================

	jQuery( document ).ready( function( $ ) {

		// Initialize cart screen on page load
		setTimeout( function() {
			cc_cart_screen();
		}, 200 );

		//-------------------------------------------------------------------------
		// ACCESSIBILITY & NAVIGATION
		//-------------------------------------------------------------------------
		
		// Tab usability
		$( '.cc-nav ul li a' ).mousedown( function() {
			$( this ).addClass( 'using-mouse' );
		} );

		$( 'body' ).keydown( function() {
			$( '.cc-nav ul li a' ).removeClass( 'using-mouse' );
		} );

		// cc-window tabbing
		var tabs = new Tabby( '[data-tabs]' );

		// Tab navigation events
		$( document ).on( 'click', '.cc-nav ul li a', function() {
			var current_tab = $( this ).attr( 'data-id' );
			if ( 'cc-cart' === current_tab ) {
				$( '.cc-pl-upsells-slider' ).resize();
			}
		} );

		//-------------------------------------------------------------------------
		// CART WINDOW INTERACTIONS
		//-------------------------------------------------------------------------
		
		// Clicking outside of mini cart
		$( document ).mouseup( function( e ) {
			var container = $( '.cc-window.visible, .cc-compass, #toast-container' );

			if ( !container.is( e.target ) && container.has( e.target ).length === 0 ) {
				if ( ccWindow.hasClass( 'visible' ) ) {

					$( '.cc-compass' ).toggleClass( 'cc-compass-open' );
					$( 'body' ).toggleClass( 'cc-window-open' );

					$( '.cc-overlay' ).hide();
					ccWindow.animate( { 'right': '-1000px' }, 'slow' ).removeClass( 'visible' );

					if ( $( '#toast-container' ).length > 0 ) {
						$( '#toast-container' ).animate( { 'right': '25px' }, 'fast' ).toggleClass( 'cc-toast-open' );
					}
				}
			}
		} );

		// Compass click handler (toggle cart window)
		$(document).on('click', '.cc-compass', function() {
			$(this).toggleClass('cc-compass-open');
			$('body').toggleClass('cc-window-open');

			if (ccWindow.hasClass('visible')) {
				$('.cc-overlay').hide();
				ccWindow.animate({'right': '-1000px'}, 'slow').removeClass('visible');
			} else {
				$('.cc-overlay').show();

				$('.cc-cart-items').html(getSkeletonHTML());
				
				tabs.toggle('#cc-cart');
				
				ccWindow.animate({'right': '0'}, 'slow').addClass('visible');

				cc_refresh_cart();
			}
		});

		// Close button for cart window
		$( document ).on( 'click', '.ccicon-x', function() {
			$( '.cc-overlay' ).hide();
			ccWindow.animate( { 'right': '-1000px' }, 'slow' ).removeClass( 'visible' );
			$( '.cc-compass' ).toggleClass( 'cc-compass-open' );
			$( 'body' ).toggleClass( 'cc-window-open' );
		} );

		//-------------------------------------------------------------------------
		// CART ITEM MANAGEMENT
		//-------------------------------------------------------------------------
		
		// Remove cart item
		$( document ).on( 'click', '.cc-cart-product-list .cc-cart-product a.remove_from_cart_button', function() {
			var button = $( this );
			cc_remove_item_from_cart( button );
		} );

		// Item quantity update
		$( document ).on( 'click', '.cc_item_quantity_update', function() {
			var $this = $(this);
			var quantityInput = $this.siblings('.cc_item_quantity');
			var currentQuantity = parseInt(quantityInput.val(), 10);
			
			if ($this.hasClass('cc_item_quantity_minus') && currentQuantity === 1) {
				var removeButton = $this.closest('.cc-cart-product').find('a.remove_from_cart_button');
				removeButton.trigger('click');
			} else {
				cc_quantity_update_buttons($this);
			}
		} );
		
		// Cart items list button clicked
		$( document ).on( 'click', '.cc_cart_items_list', function() {
			cc_cart_item_list();
		} );

		// View cart button clicked
		$( document ).on( 'click', '.added_to_cart.wc-forward, .woocommerce-error .button.wc-forward', function( e ) {
			e.preventDefault();
			cc_cart_item_list();
		} );

		// Product added view cart button
		$( document ).on( 'click', '.cc-pl-info .cc-pl-actions .cc-view-cart', function() {
			tabs.toggle( '#cc-cart' );
		} );

		//-------------------------------------------------------------------------
		// SAVE FOR LATER FUNCTIONALITY
		//-------------------------------------------------------------------------
		
		// Remove from save for later
		$( document ).on( 'click', 'a.remove_from_sfl_button', function() {
			var button = $( this );
			cc_remove_item_from_save_for_later( button );
		} );

		// Save for later button click from the Caddy cart screen
		$( document ).on( 'click', '.save_for_later_btn', function() {
			cc_save_for_later( $( this ) );
		} );

		// Move to cart button clicked
		$( document ).on( 'click', '.cc_cart_from_sfl', function() {
			cc_move_to_cart( $( this ) );
		} );

		// Move to cart button
		$( document ).on( 'click', '.cc_back_to_cart', function() {
			cc_back_to_cart();
		} );

		// Saved items list button clicked
		$( document ).on( 'click', '.cc_saved_items_list', function() {
			cc_saved_item_list();
		} );

		// Clicks on a view saved items
		$( document ).on( 'click', '.cc-view-saved-items', function() {
			var tabs = new Tabby( '[data-tabs]' );
			tabs.toggle( '#cc-saves' );
		} );

		// Handle variations with save for later
		if ( $( '.variations_form' ).length > 0 ) {
			$( '.cc_add_product_to_sfl' ).addClass( 'disabled' );
			$( this ).each( function() {
				$( this ).on( 'found_variation', function( event, variation ) {
					$( '.cc_add_product_to_sfl' ).removeClass( 'disabled' );
				} );

				$( this ).on( 'reset_data', function() {
					$( '.cc_add_product_to_sfl' ).addClass( 'disabled' );
				} );
			} );
		}

		//-------------------------------------------------------------------------
		// COUPON HANDLING
		//-------------------------------------------------------------------------
		
		// Apply coupon form submission
		$( document ).on( 'submit', '#apply_coupon_form', function( e ) {
			e.preventDefault();
			cc_coupon_code_applied_from_cart_screen();
		} );

		// Remove coupon
		$( document ).on( 'click', '.cc-applied-coupon .cc-remove-coupon', function() {
			cc_coupon_code_removed_from_cart_screen( $( this ) );
		} );

		// Coupon form toggle
		$(document).on('click', '.cc-coupon-title', function() {
			var $couponForm = $('.cc-coupon-form');
			var $couponWrapper = $('.cc-coupon');
			
			if ($couponForm.is(':hidden')) {
				$couponWrapper.addClass('cc-coupon-open');
				$couponForm.slideDown(300);
			} else {
				$couponForm.slideUp(300, function() {
					$couponWrapper.removeClass('cc-coupon-open');
				});
			}
		});

		// Update the error notice click handler
		$(document).on('click', '.cc-coupon .woocommerce-error', function(e) {
			var $error = $(this);
			var clickX = e.pageX - $error.offset().left;
			
			if (clickX > $error.width() - 40) {
				$(this).closest('.woocommerce-notices-wrapper').fadeOut(200);
			}
		});

		//-------------------------------------------------------------------------
		// ADD TO CART HANDLING
		//-------------------------------------------------------------------------
		
		// Add a flag to track the source of the event
		var handlingOurAjaxResponse = false;

		// Add a flag to prevent double handling
		var handlingCartUpdate = false;

		/**
		 * Handle WooCommerce 'added_to_cart' event
		 * 
		 * Triggered when products are successfully added to the cart.
		 * Manages cart window display based on:
		 * - Device type (mobile/desktop)
		 * - User preferences for notifications
		 * - Whether the product was added from recommendations
		 * 
		 * Prevents duplicate event handling with the handlingCartUpdate flag.
		 * 
		 * @param {Event} e - The event object
		 * @param {Object} fragments - Cart fragments returned from WooCommerce
		 * @param {string} cart_hash - The cart hash
		 * @param {Object} this_button - The button that triggered the add to cart action
		 */
		$('body').on('added_to_cart', function(e, fragments, cart_hash, this_button) {

			if (handlingCartUpdate) {
				return;
			}
			
			handlingCartUpdate = true;
			
			var cpDeskNotice = $('.cc-compass-desk-notice').val(),
				cpMobNotice = $('.cc-compass-mobile-notice').val();

			var isRecommendationButton = $(this_button).closest('.cc-pl-recommendations').length > 0;

			if (isRecommendationButton) {
				cc_cart_screen();
			}

			if (cc_ajax_script.is_mobile && !ccWindow.hasClass('visible') && 'mob_disable_notices' === cpMobNotice) {
				setTimeout(function() {
					$('.cc-compass').trigger('click');
					handlingCartUpdate = false;
				}, 20);
			} else if (!cc_ajax_script.is_mobile && !ccWindow.hasClass('visible')
				&& ('desk_disable_notices' === cpDeskNotice || 'desk_notices_caddy_window' === cpDeskNotice || '' === cpDeskNotice)) {
				setTimeout(function() {
					$('.cc-compass').trigger('click');
					handlingCartUpdate = false;
				}, 20);
			} else {
				handlingCartUpdate = false;
			}
		});

		/**
		 * Custom Add to Cart implementation
		 * 
		 * Overrides WooCommerce default add-to-cart behavior to provide enhanced functionality:
		 * - Handles both simple and variable products
		 * - Supports product recommendations
		 * - Handles different product types appropriately
		 * - Provides visual feedback during the AJAX request
		 */
		$( document ).on( 'click', '.single_add_to_cart_button', function( e ) {
			e.preventDefault();

			if ( $( this ).hasClass( 'disabled' ) ) {
				return;
			}

			var $button = $( this );
			
			if ($button.hasClass('product_type_subscription') && !$button.hasClass('product_type_variable-subscription')) {
				return true;
			}

			if ( $( this ).hasClass( 'product_type_variable' ) || $( this ).hasClass( 'product_type_bundle' ) ||
				$( this ).hasClass( 'product_type_external' ) ) {
				window.location = $( this ).attr( 'href' );
				return;
			}

			var $form = $button.closest( 'form.cart' );
			var productData = $form.serializeArray();
			var hasProductId = false;
			var hasVariationId = false;

			$.each( productData, function( key, form_item ) {
				if ( form_item.name === 'productID' || form_item.name === 'add-to-cart' ) {
					if ( form_item.value ) {
						hasProductId = true;
					}
				}
				if ( form_item.name === 'variation_id' ) {
					if ( form_item.value && form_item.value !== '0' ) {
						hasVariationId = true;
					}
				}
			} );

			if ( !hasProductId ) {
				var productID = $button.data( 'product_id' );
			}

			if ( $button.attr( 'name' ) && $button.attr( 'name' ) == 'add-to-cart' && $button.attr( 'value' ) ) {
				var productID = $button.attr( 'value' );
			}

			if ( productID ) {
				productData.push( { name: 'add-to-cart', value: productID } );
			}

			if (!hasVariationId && $button.closest('.cc-pl-recommendations').length > 0) {
				var variationId = $button.data('variation_id');
				if (variationId) {
					productData.push({ name: 'variation_id', value: variationId });
				}
			}

			productData.push( { name: 'action', value: 'cc_add_to_cart' } );
			
			let ajaxUrl;
			if (cc_ajax_script.wc_ajax_url) {
				ajaxUrl = cc_ajax_script.wc_ajax_url.replace('%%endpoint%%', 'cc_add_to_cart');
			} else {
				ajaxUrl = '/?wc-ajax=cc_add_to_cart';
			}

			productData.push({ name: 'security', value: cc_ajax_script.nonce });

			$( document.body ).trigger( 'adding_to_cart', [$button, productData] );
			
			$.ajax( {
				type: 'post',
				url: ajaxUrl,
				data: $.param( productData ),
				beforeSend: function( response ) {
					$( '.cc-compass > .licon, .cc-compass > i' ).hide();
					$( '.cc-compass > .cc-loader' ).show();
					$button.removeClass( 'added' ).addClass( 'loading' );
				},
				success: function( response ) {
					if ( response.error && response.product_url ) {
						window.location.reload();
						$(document.body).trigger('wc_fragments_refreshed');
					} else if ( response.error && response.message ) {
						alert(response.message);
						$button.removeClass('loading');
					} else {
						$(document.body).trigger('wc_fragments_refreshed');
						$(document.body).trigger('added_to_cart', [response.fragments, response.cart_hash, $button]);
					}
				},
				complete: function( response ) {
					$( '.cc-compass > .cc-loader' ).hide();
					$( '.cc-compass > .licon, .cc-compass > i' ).show();
					$button.addClass( 'added' ).removeClass( 'loading' );
				}
			} );

			return false;
		} );
	});

})( jQuery );