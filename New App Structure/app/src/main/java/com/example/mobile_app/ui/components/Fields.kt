package com.example.mobile_app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.mobile_app.ui.theme.Brand
import com.example.mobile_app.ui.theme.JakartaSans

private val FieldShape = RoundedCornerShape(18.dp)

private val InputTextStyle = TextStyle(
    fontFamily = JakartaSans,
    fontSize = 18.sp,
    fontWeight = FontWeight.Medium,
    color = Brand.Ink,
)

/**
 * The filled card input used throughout onboarding. The label sits inside the
 * card and shrinks to a caption once there is a value, which is what gives the
 * reference design its calm, form-free feel.
 */
@Composable
fun FieldCard(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    onImeAction: (() -> Unit)? = null,
    focusRequester: FocusRequester? = null,
) {
    val hasValue = value.isNotEmpty()

    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(FieldShape)
            .background(Brand.Surface)
            .padding(horizontal = 18.dp, vertical = 14.dp),
    ) {
        Column {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                color = Brand.InkMuted,
                fontSize = if (hasValue) 13.sp else 17.sp,
            )
            if (hasValue) Spacer(Modifier.size(2.dp))
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                textStyle = InputTextStyle,
                singleLine = true,
                cursorBrush = SolidColor(Brand.Accent),
                keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
                keyboardActions = KeyboardActions(
                    onNext = { onImeAction?.invoke() },
                    onDone = { onImeAction?.invoke() },
                    onGo = { onImeAction?.invoke() },
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .then(if (focusRequester != null) Modifier.focusRequester(focusRequester) else Modifier),
            )
        }
    }
}

/** A read-only [FieldCard] look-alike that opens a picker when tapped. */
@Composable
fun FieldCardButton(
    label: String,
    value: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val hasValue = value.isNotEmpty()

    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(FieldShape)
            .background(Brand.Surface)
            .clickable(onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 18.dp),
    ) {
        Column {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                color = Brand.InkMuted,
                fontSize = if (hasValue) 13.sp else 17.sp,
            )
            if (hasValue) {
                Spacer(Modifier.size(4.dp))
                Text(
                    text = value,
                    style = MaterialTheme.typography.titleMedium,
                    fontSize = 18.sp,
                    color = Brand.Ink,
                )
            }
        }
    }
}

/** Country-code selector and phone field, side by side as in the design. */
@Composable
fun PhoneNumberRow(
    dialCode: String,
    flag: String,
    phone: String,
    onPhoneChange: (String) -> Unit,
    onPickCountry: () -> Unit,
    modifier: Modifier = Modifier,
    onImeAction: () -> Unit = {},
) {
    Row(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .width(116.dp)
                .clip(FieldShape)
                .background(Brand.SurfaceSunken)
                .clickable(onClick = onPickCountry)
                .padding(horizontal = 14.dp, vertical = 22.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(text = flag, fontSize = 18.sp)
            Text(text = dialCode, style = MaterialTheme.typography.titleMedium, color = Brand.Ink)
            Icon(
                imageVector = Icons.Default.KeyboardArrowDown,
                contentDescription = "Change country",
                tint = Brand.InkMuted,
                modifier = Modifier.size(18.dp),
            )
        }

        Spacer(Modifier.width(10.dp))

        Box(
            modifier = Modifier
                .weight(1f)
                .clip(FieldShape)
                .background(Brand.SurfaceSunken)
                .padding(horizontal = 18.dp, vertical = 14.dp),
            contentAlignment = Alignment.CenterStart,
        ) {
            Column {
                Text(
                    text = "Phone number",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Brand.InkMuted,
                    fontSize = if (phone.isNotEmpty()) 13.sp else 17.sp,
                )
                if (phone.isNotEmpty()) Spacer(Modifier.size(2.dp))
                BasicTextField(
                    value = phone,
                    onValueChange = { onPhoneChange(it.filter(Char::isDigit).take(15)) },
                    textStyle = InputTextStyle,
                    singleLine = true,
                    cursorBrush = SolidColor(Brand.Accent),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Phone,
                        imeAction = ImeAction.Done,
                    ),
                    keyboardActions = KeyboardActions(onDone = { onImeAction() }),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

/**
 * Six code boxes driven by one hidden text field: the field owns the value and
 * the keyboard, and the boxes are pure presentation of it.
 */
@Composable
fun OtpBoxes(
    code: String,
    onCodeChange: (String) -> Unit,
    focusRequester: FocusRequester,
    modifier: Modifier = Modifier,
    length: Int = 6,
) {
    BasicTextField(
        value = code,
        onValueChange = { onCodeChange(it.filter(Char::isDigit).take(length)) },
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.NumberPassword,
            imeAction = ImeAction.Done,
        ),
        // The real field is invisible; the boxes below are what the user sees.
        textStyle = TextStyle(color = Color.Transparent, fontSize = 1.sp),
        cursorBrush = SolidColor(Color.Transparent),
        modifier = modifier
            .fillMaxWidth()
            .focusRequester(focusRequester),
        decorationBox = {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                repeat(length) { index ->
                    val char = code.getOrNull(index)?.toString().orEmpty()
                    val isCursor = index == code.length
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .aspectRatio(0.92f)
                            .clip(RoundedCornerShape(14.dp))
                            .background(Color.White)
                            .then(
                                if (isCursor) {
                                    Modifier.border(1.5.dp, Brand.Ink, RoundedCornerShape(14.dp))
                                } else {
                                    Modifier
                                }
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = char,
                            style = MaterialTheme.typography.titleMedium,
                            fontSize = 20.sp,
                            color = Brand.Ink,
                            textAlign = TextAlign.Center,
                        )
                    }
                }
            }
        },
    )
}

/** The small padlock reassurance line that sits under most onboarding inputs. */
@Composable
fun PrivacyNote(text: String, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(
            imageVector = Icons.Outlined.Lock,
            contentDescription = null,
            tint = Brand.InkFaint,
            modifier = Modifier.size(17.dp),
        )
        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium,
            color = Brand.InkMuted,
        )
    }
}
