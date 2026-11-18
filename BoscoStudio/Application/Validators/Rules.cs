using System.Text.RegularExpressions;
using FluentValidation;

namespace BoscoStudio.Application.Validators;

/// <summary>
/// Reusable field rules, so "what is a valid phone / amount / percent / date / link" is defined once.
/// The Angular forms mirror these in src/app/shared/validators.ts - keep the two in step.
/// </summary>
public static class Rules
{
    public const decimal MaxMoney = 99_999_999.99m;
    public static readonly DateOnly EarliestDate = new(2000, 1, 1);

    private static readonly Regex PhoneChars = new(@"^\+?[0-9\s\-()]+$", RegexOptions.Compiled);
    private static readonly Regex LetterAndDigit = new(@"(?=.*\p{L})(?=.*\d)", RegexOptions.Compiled);

    // ---------- phone ----------

    /// <summary>7 to 15 digits (E.164 maximum is 15), optional leading +, spaces / dashes / brackets allowed. Blank is valid.</summary>
    public static bool IsValidPhone(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return true;
        string v = value.Trim();
        if (!PhoneChars.IsMatch(v)) return false;
        int digits = v.Count(char.IsDigit);
        return digits is >= 7 and <= 15;
    }

    public static IRuleBuilderOptions<T, string?> Phone<T>(this IRuleBuilder<T, string?> rule) =>
        rule.MaximumLength(30).Must(IsValidPhone)
            .WithMessage("Enter a valid phone number: 7 to 15 digits (a leading +, spaces, dashes and brackets are allowed).");

    public static IRuleBuilderOptions<T, string?> RequiredPhone<T>(this IRuleBuilder<T, string?> rule) =>
        rule.NotEmpty().WithMessage("Phone number is required.").Phone();

    // ---------- text ----------

    /// <summary>A person / business name: trimmed length range and at least one letter (so "1234" or "---" is rejected).</summary>
    public static IRuleBuilderOptions<T, string?> PersonName<T>(this IRuleBuilder<T, string?> rule, int max) =>
        rule.NotEmpty().WithMessage("Name is required.")
            .Must(n => n is null || n.Trim().Length >= 2).WithMessage("Name must be at least 2 characters.")
            .MaximumLength(max)
            .Must(n => n is null || n.Any(char.IsLetter)).WithMessage("Name must contain letters.");

    /// <summary>Blank is valid. Otherwise a single plain address like name@domain.com (no display names, domain needs a dot).</summary>
    public static bool IsValidEmail(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return true;
        string v = value.Trim();
        return System.Net.Mail.MailAddress.TryCreate(v, out var a) && a.Address == v && a.Host.Contains('.');
    }

    public static IRuleBuilderOptions<T, string?> OptionalEmail<T>(this IRuleBuilder<T, string?> rule) =>
        rule.MaximumLength(150).Must(IsValidEmail).WithMessage("Enter a valid email address, e.g. name@example.com.");

    public static IRuleBuilderOptions<T, string?> HttpUrl<T>(this IRuleBuilder<T, string?> rule, int max) =>
        rule.MaximumLength(max)
            .Must(u => string.IsNullOrWhiteSpace(u) || (Uri.TryCreate(u.Trim(), UriKind.Absolute, out var uri) && uri.Scheme is "http" or "https"))
            .WithMessage("Enter a valid link starting with http:// or https://.");

    // ---------- numbers ----------

    /// <summary>Amount of money: 0 .. 99,999,999.99 with at most 2 decimals.</summary>
    public static IRuleBuilderOptions<T, decimal> Money<T>(this IRuleBuilder<T, decimal> rule) =>
        rule.InclusiveBetween(0, MaxMoney).WithMessage($"Enter an amount between 0 and {MaxMoney:N2}.")
            .PrecisionScale(12, 2, false).WithMessage("Use at most 2 decimal places.");

    public static IRuleBuilderOptions<T, decimal> PositiveMoney<T>(this IRuleBuilder<T, decimal> rule) =>
        rule.GreaterThan(0).WithMessage("Amount must be greater than 0.")
            .LessThanOrEqualTo(MaxMoney).WithMessage($"Amount cannot exceed {MaxMoney:N2}.")
            .PrecisionScale(12, 2, false).WithMessage("Use at most 2 decimal places.");

    public static IRuleBuilderOptions<T, decimal?> MoneyOrNull<T>(this IRuleBuilder<T, decimal?> rule) =>
        rule.Must(v => v is null || (v >= 0 && v <= MaxMoney && decimal.Round(v.Value, 2) == v))
            .WithMessage($"Enter an amount between 0 and {MaxMoney:N2} with at most 2 decimals.");

    /// <summary>0 - 100 with at most 2 decimals.</summary>
    public static IRuleBuilderOptions<T, decimal> Percent<T>(this IRuleBuilder<T, decimal> rule) =>
        rule.InclusiveBetween(0, 100).WithMessage("Enter a percentage between 0 and 100.")
            .PrecisionScale(5, 2, false).WithMessage("Use at most 2 decimal places.");

    public static IRuleBuilderOptions<T, decimal?> PercentOrNull<T>(this IRuleBuilder<T, decimal?> rule) =>
        rule.Must(v => v is null || (v >= 0 && v <= 100 && decimal.Round(v.Value, 2) == v))
            .WithMessage("Enter a percentage between 0 and 100 with at most 2 decimals.");

    // ---------- dates ----------

    private static DateOnly Today => DateOnly.FromDateTime(DateTime.Today);

    /// <summary>Event / due dates: 1 Jan 2000 .. 10 years ahead.</summary>
    public static IRuleBuilderOptions<T, DateOnly> SensibleDate<T>(this IRuleBuilder<T, DateOnly> rule) =>
        rule.Must(d => d >= EarliestDate && d <= Today.AddYears(10))
            .WithMessage("Enter a date between 2000 and 10 years from now.");

    public static IRuleBuilderOptions<T, DateOnly?> SensibleDateOrNull<T>(this IRuleBuilder<T, DateOnly?> rule) =>
        rule.Must(d => d is null || (d >= EarliestDate && d <= Today.AddYears(10)))
            .WithMessage("Enter a date between 2000 and 10 years from now.");

    /// <summary>Payments, expenses and delivery dates record something that happened: no dates in the future (1 day of slack for time zones).</summary>
    public static IRuleBuilderOptions<T, DateOnly?> PastOrToday<T>(this IRuleBuilder<T, DateOnly?> rule) =>
        rule.Must(d => d is null || (d >= EarliestDate && d <= Today.AddDays(1)))
            .WithMessage("The date cannot be in the future (or before 2000).");

    // ---------- passwords ----------

    public static IRuleBuilderOptions<T, string> StrongPassword<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().WithMessage("Password is required.")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters.")
            .MaximumLength(100)
            .Must(p => LetterAndDigit.IsMatch(p ?? "")).WithMessage("Password must contain at least one letter and one number.");
}
