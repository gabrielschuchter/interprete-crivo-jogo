shader_type canvas_item;

// Mixes the sprite toward white by `flash` (0..1), preserving transparency.
uniform float flash : hint_range(0.0, 1.0) = 0.0;

void fragment() {
	vec4 c = texture(TEXTURE, UV);
	c.rgb = mix(c.rgb, vec3(1.0), flash * c.a);
	COLOR = c;
}
