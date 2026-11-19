using System.Text.RegularExpressions;
using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using FluentValidation;

namespace BoscoStudio.Application.Validators;

// Field limits match the column sizes in Database/PhotoStudioDB.sql. Reusable rules live in Rules.cs.

// =========================== ORDERS ===========================

/// <summary>Shared rules for create + update order. Concrete subclasses below are what ASP.NET picks up.</summary>
public abstract class OrderRequestValidator<T> : AbstractValidator<T> where T : UpdateOrderRequest
{
    protected OrderRequestValidator()
    {
        RuleFor(x => x.EventType).NotEmpty().MaximumLength(30);   // existence is checked against the EventTypes table in OrderService
        RuleFor(x => x.PackageId).GreaterThan(0).When(x => x.PackageId.HasValue);

        RuleFor(x => x.Slots).NotEmpty().WithMessage("Add at least one date / time slot.")
            .Must(s => s.Count <= 30).WithMessage("A maximum of 30 slots is allowed.");
        RuleForEach(x => x.Slots).ChildRules(s =>
        {
            s.RuleFor(x => x.EventDate).SensibleDate();
            s.RuleFor(x => x.EndTime).GreaterThan(x => x.StartTime).WithMessage("End time must be after start time.");
            s.RuleFor(x => x.Title).MaximumLength(100);
            s.RuleFor(x => x.Venue).MaximumLength(300);
        });

        RuleFor(x => x.PhotoAmount).MoneyOrNull();
        RuleFor(x => x.VideoAmount).MoneyOrNull();
        RuleFor(x => x.AlbumAmount).MoneyOrNull();
        RuleFor(x => x).Must(x => x.IncludePhoto || x.IncludeVideo || x.IncludeAlbum)
            .WithMessage("Tick at least one of Photo, Video or Album.");
        RuleFor(x => x.DiscountAmount).Money();   // "not more than the package amount" is checked in OrderService, against the ticked parts
        RuleFor(x => x.TaxPercent).PercentOrNull();
        RuleFor(x => x.TaxSplit).Must(TaxSplits.All.Contains).WithMessage("Tax split must be Single or CGST+SGST.");
        RuleFor(x => x.CgstPercent).CgstWithin(x => x.TaxPercent);
        RuleFor(x => x.Venue).MaximumLength(300);
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}

public class UpdateOrderRequestValidator : OrderRequestValidator<UpdateOrderRequest> { }

public class CreateOrderRequestValidator : OrderRequestValidator<CreateOrderRequest>
{
    public CreateOrderRequestValidator()
    {
        RuleFor(x => x).Must(x => x.ClientId.HasValue ^ x.NewClient is not null)
            .WithMessage("Choose an existing client or enter a new one (not both).");
        RuleFor(x => x.ClientId).GreaterThan(0).When(x => x.ClientId.HasValue);
        When(x => x.NewClient is not null, () => RuleFor(x => x.NewClient!).SetValidator(new NewClientRequestValidator()));
        RuleFor(x => x.InitialStatus)
            .Must(s => s is OrderStatuses.PreOrder or OrderStatuses.Pending or OrderStatuses.Confirmed)
            .WithMessage("A new order can start as Pre-Order, Pending or Confirmed.");
    }
}

public class NewClientRequestValidator : AbstractValidator<NewClientRequest>
{
    public NewClientRequestValidator()
    {
        RuleFor(x => x.FullName).PersonName(120);
        RuleFor(x => x.Phone).RequiredPhone();
        RuleFor(x => x.WhatsAppNo).Phone();
        RuleFor(x => x.Email).OptionalEmail();
        RuleFor(x => x.Address).MaximumLength(300);
    }
}

public class ChangeOrderStatusRequestValidator : AbstractValidator<ChangeOrderStatusRequest>
{
    public ChangeOrderStatusRequestValidator() =>
        RuleFor(x => x.Status).Must(OrderStatuses.All.Contains).WithMessage("Unknown order status.");
}

public class UpdateDeliverableRequestValidator : AbstractValidator<UpdateDeliverableRequest>
{
    public UpdateDeliverableRequestValidator()
    {
        foreach (var rule in new[]
        {
            RuleFor(x => x.SelectionStatus), RuleFor(x => x.PhotoEditStatus),
            RuleFor(x => x.TeaserEditStatus), RuleFor(x => x.FullFilmEditStatus)
        })
            rule.Must(WorkStatuses.All.Contains).WithMessage("Status must be Not Started, In Progress or Completed.");

        RuleFor(x => x.SelectionMode).Must(m => m is "Client Selection" or "Studio Selection");
        RuleFor(x => x.CloudProvider).Must(p => p is "Google Drive" or "WeTransfer" or "Dropbox" or "Other")
            .When(x => !string.IsNullOrEmpty(x.CloudProvider));
        RuleFor(x => x.CloudLink).HttpUrl(500);
        RuleFor(x => x.DeliveredOn).PastOrToday();
    }
}

// =========================== MONEY ===========================

public class CreatePaymentRequestValidator : AbstractValidator<CreatePaymentRequest>
{
    public CreatePaymentRequestValidator()
    {
        RuleFor(x => x.PaymentType).Must(PaymentTypes.All.Contains).WithMessage("Unknown payment type.");
        RuleFor(x => x.PaymentMode).Must(PaymentTypes.Modes.Contains).WithMessage("Unknown payment mode.");
        RuleFor(x => x.Amount).PositiveMoney();
        RuleFor(x => x.PaymentDate).PastOrToday();
        RuleFor(x => x.TransactionRef).MaximumLength(100)
            .Matches(@"^[A-Za-z0-9 _\-/.#:]*$").WithMessage("Transaction reference may only contain letters, numbers and - _ / . # :");
        RuleFor(x => x.Notes).MaximumLength(300);
    }
}

public class CreateExpenseRequestValidator : AbstractValidator<CreateExpenseRequest>
{
    public CreateExpenseRequestValidator()
    {
        RuleFor(x => x.Category).Must(ExpenseCategories.All.Contains).WithMessage("Unknown expense category.");
        RuleFor(x => x.Amount).PositiveMoney();
        RuleFor(x => x.ExpenseDate).PastOrToday();
        RuleFor(x => x.Description).MaximumLength(300);
    }
}

// =========================== ALBUMS ===========================

public abstract class AlbumRequestValidator<T> : AbstractValidator<T> where T : CreateAlbumRequest
{
    protected AlbumRequestValidator()
    {
        RuleFor(x => x.AlbumType).NotEmpty().MaximumLength(60);
        RuleFor(x => x.SheetCount).InclusiveBetween(1, 500).WithMessage("Sheet count must be between 1 and 500.");
        RuleFor(x => x.PrintVendorName).MaximumLength(120);
        // The contact is a phone number or an email address.
        RuleFor(x => x.PrintVendorContact).MaximumLength(60)
            .Must(c => string.IsNullOrWhiteSpace(c) || Rules.IsValidPhone(c) || Rules.IsValidEmail(c))
            .WithMessage("Enter a valid phone number (7 to 15 digits) or an email address.");
        RuleFor(x => x.PrintCost).MoneyOrNull();
        RuleFor(x => x.Notes).MaximumLength(500);
    }
}

public class CreateAlbumRequestValidator : AlbumRequestValidator<CreateAlbumRequest> { }
public class UpdateAlbumRequestValidator : AlbumRequestValidator<UpdateAlbumRequest> { }

public class ChangeAlbumStageRequestValidator : AbstractValidator<ChangeAlbumStageRequest>
{
    public ChangeAlbumStageRequestValidator() =>
        RuleFor(x => x.Stage).Must(AlbumStages.Pipeline.Contains).WithMessage("Unknown album stage.");
}

// =========================== DOCUMENTS ===========================

public class CreateDocumentRequestValidator : AbstractValidator<CreateDocumentRequest>
{
    public CreateDocumentRequestValidator()
    {
        RuleFor(x => x.DocumentType).Must(t => t is "Quotation" or "Invoice");
        RuleFor(x => x.DueDate).SensibleDateOrNull();
        RuleFor(x => x.Notes).MaximumLength(500);
        RuleFor(x => x.Terms).MaximumLength(4000);
    }
}

public class UpdateDocumentRequestValidator : AbstractValidator<UpdateDocumentRequest>
{
    public UpdateDocumentRequestValidator()
    {
        RuleFor(x => x.DueDate).SensibleDateOrNull();
        RuleFor(x => x.Notes).MaximumLength(500);
        RuleFor(x => x.Terms).MaximumLength(4000);
        RuleFor(x => x.DiscountAmount).MoneyOrNull();
        RuleFor(x => x.TaxPercent).PercentOrNull();
        RuleFor(x => x.TaxSplit).Must(s => s is null || TaxSplits.All.Contains(s)).WithMessage("Tax split must be Single or CGST+SGST.");
        RuleFor(x => x.CgstPercent).CgstWithin(x => x.TaxPercent);
        RuleFor(x => x.Lines).Must(l => l is null || l.Count is > 0 and <= 30).WithMessage("Add between 1 and 30 items.");
        RuleForEach(x => x.Lines).ChildRules(l =>
        {
            l.RuleFor(i => i.Description).NotEmpty().WithMessage("Item description is required.").MaximumLength(300);
            l.RuleFor(i => i.Quantity).GreaterThan(0).LessThanOrEqualTo(10000).PrecisionScale(9, 2, false);
            l.RuleFor(i => i.UnitPrice).Money();
        });
    }
}

// =========================== CLIENTS ===========================

public class SaveClientRequestValidator : AbstractValidator<SaveClientRequest>
{
    public SaveClientRequestValidator()
    {
        RuleFor(x => x.FullName).PersonName(120);
        RuleFor(x => x.Phone).RequiredPhone();
        RuleFor(x => x.WhatsAppNo).Phone();
        RuleFor(x => x.Email).OptionalEmail();
        RuleFor(x => x.Address).MaximumLength(300);
        RuleFor(x => x.Notes).MaximumLength(500);
    }
}

// =========================== OWNERS & ACCOUNT ===========================

internal static class AccountRules
{
    public static IRuleBuilderOptions<T, List<string>?> AllKnownPermissions<T>(this IRuleBuilder<T, List<string>?> rule) =>
        rule.Must(p => p is null || p.All(AppPermissions.All.Contains)).WithMessage("Unknown permission.");

    /// <summary>The CGST rate (when given) must be 0 .. total tax rate, with at most 2 decimals. SGST is the remainder.</summary>
    public static IRuleBuilderOptions<T, decimal?> CgstWithin<T>(this IRuleBuilder<T, decimal?> rule, Func<T, decimal?> totalTax) =>
        rule.Must((x, c) => c is null || (c >= 0 && decimal.Round(c.Value, 2) == c && (totalTax(x) is not { } t || c <= t)))
            .WithMessage("CGST must be between 0 and the total tax %, with at most 2 decimals.");

    public static IRuleBuilderOptions<T, string> Username<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().Length(3, 50).Matches("^[A-Za-z0-9._-]+$")
            .WithMessage("Username: 3-50 letters, numbers, dot, dash or underscore (no spaces).");
}

public class CreateOwnerRequestValidator : AbstractValidator<CreateOwnerRequest>
{
    public CreateOwnerRequestValidator()
    {
        RuleFor(x => x.Username).Username();
        RuleFor(x => x.FullName).PersonName(100);
        RuleFor(x => x.Email).OptionalEmail();
        RuleFor(x => x.Password).StrongPassword();
        RuleFor(x => x.Role).Must(Roles.All.Contains).WithMessage("Role must be Admin, Manager or Staff.");
        RuleFor(x => x.Permissions).AllKnownPermissions();
    }
}

public class UpdateOwnerRequestValidator : AbstractValidator<UpdateOwnerRequest>
{
    public UpdateOwnerRequestValidator()
    {
        RuleFor(x => x.Username).Username();
        RuleFor(x => x.FullName).PersonName(100);
        RuleFor(x => x.Email).OptionalEmail();
        When(x => !string.IsNullOrEmpty(x.NewPassword), () => RuleFor(x => x.NewPassword!).StrongPassword());
        RuleFor(x => x.Permissions).AllKnownPermissions();
    }
}

public class UpdateOwnerRoleRequestValidator : AbstractValidator<UpdateOwnerRoleRequest>
{
    public UpdateOwnerRoleRequestValidator() =>
        RuleFor(x => x.Role).Must(Roles.All.Contains).WithMessage("Role must be Admin, Manager or Staff.");
}

public class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileRequestValidator()
    {
        RuleFor(x => x.Username).Username();
        RuleFor(x => x.FullName).PersonName(100);
        RuleFor(x => x.Email).OptionalEmail();
        RuleFor(x => x.CurrentPassword).NotEmpty().MaximumLength(100);
    }
}

public class ResetOwnerPasswordRequestValidator : AbstractValidator<ResetOwnerPasswordRequest>
{
    public ResetOwnerPasswordRequestValidator() => RuleFor(x => x.NewPassword).StrongPassword();
}

public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty().MaximumLength(100);
        RuleFor(x => x.NewPassword).StrongPassword()
            .Must((r, p) => p != r.CurrentPassword).WithMessage("New password must be different from the current one.");
    }
}

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Username).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Password).NotEmpty().MaximumLength(100);
    }
}

// =========================== SETTINGS ===========================

public class SaveEventTypeRequestValidator : AbstractValidator<SaveEventTypeRequest>
{
    public SaveEventTypeRequestValidator()
    {
        RuleFor(x => x.EventTypeName).NotEmpty().Length(2, 30)
            .Matches(@"^[\p{L}\p{N} &/\-]+$").WithMessage("Use letters, numbers, spaces, - & / only.");
        RuleFor(x => x.SortOrder).InclusiveBetween(0, 1000);
    }
}

public class SavePackageRequestValidator : AbstractValidator<SavePackageRequest>
{
    public SavePackageRequestValidator()
    {
        RuleFor(x => x.PackageName).NotEmpty().Length(2, 120);
        RuleFor(x => x.PhotoPrice).MoneyOrNull();
        RuleFor(x => x.VideoPrice).MoneyOrNull();
        RuleFor(x => x.AlbumPrice).MoneyOrNull();
        RuleFor(x => x).Must(x => x.PhotoPrice.HasValue || x.VideoPrice.HasValue || x.AlbumPrice.HasValue)
            .WithMessage("Include at least one of Photo, Video or Album, with its price.");
        RuleFor(x => x.Inclusions).MaximumLength(1000);
    }
}

public class UpdateStudioSettingsRequestValidator : AbstractValidator<UpdateStudioSettingsRequest>
{
    public UpdateStudioSettingsRequestValidator()
    {
        RuleFor(x => x.StudioName).NotEmpty().Length(2, 150);
        RuleFor(x => x.Tagline).MaximumLength(200);
        RuleFor(x => x.AddressLine).MaximumLength(300);
        RuleFor(x => x.Phone).Phone();
        RuleFor(x => x.Email).OptionalEmail();
        // GST / VAT number: 5-20 letters, digits, spaces or dashes (a 15-character GSTIN fits).
        RuleFor(x => x.TaxRegistrationNo).Matches(@"^[A-Za-z0-9 \-]{5,20}$").When(x => !string.IsNullOrWhiteSpace(x.TaxRegistrationNo))
            .WithMessage("Enter 5-20 letters / digits (a GSTIN has 15).");
        RuleFor(x => x.DefaultTaxPercent).Percent();
        RuleFor(x => x.InvoicePrefix).Matches("^[A-Za-z]{2,10}$").WithMessage("Prefix must be 2-10 letters, e.g. INV.");
        RuleFor(x => x.QuotationPrefix).Matches("^[A-Za-z]{2,10}$").WithMessage("Prefix must be 2-10 letters, e.g. QTN.");
        RuleFor(x => x.QuotationPrefix).NotEqual(x => x.InvoicePrefix, StringComparer.OrdinalIgnoreCase)
            .WithMessage("Invoice and quotation prefixes must be different.");
        RuleFor(x => x.DefaultTerms).MaximumLength(4000);
        RuleFor(x => x.BankDetails).MaximumLength(500);
        RuleFor(x => x.LogoUrl).HttpUrl(300);
    }
}
