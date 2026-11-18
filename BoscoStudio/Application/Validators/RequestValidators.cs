using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using FluentValidation;

namespace BoscoStudio.Application.Validators;

/// <summary>Shared rules for create + update order. Concrete subclasses below are what ASP.NET picks up.</summary>
public abstract class OrderRequestValidator<T> : AbstractValidator<T> where T : UpdateOrderRequest
{
    protected OrderRequestValidator()
    {
        RuleFor(x => x.EventType).NotEmpty().MaximumLength(30);   // existence is checked against the EventTypes table in OrderService
        RuleFor(x => x.Slots).NotEmpty().WithMessage("Add at least one date / time slot.");
        RuleForEach(x => x.Slots).ChildRules(s =>
        {
            s.RuleFor(x => x.EndTime).GreaterThan(x => x.StartTime).WithMessage("End time must be after start time.");
        });
        RuleFor(x => x.PackageAmount).GreaterThanOrEqualTo(0).When(x => x.PackageAmount.HasValue);
        RuleFor(x => x.DiscountAmount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.DiscountAmount).LessThanOrEqualTo(x => x.PackageAmount!.Value)
            .When(x => x.PackageAmount.HasValue).WithMessage("Discount cannot exceed the package amount.");
        RuleFor(x => x.TaxPercent).InclusiveBetween(0, 100).When(x => x.TaxPercent.HasValue);
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
        RuleFor(x => x.NewClient!.FullName).NotEmpty().MaximumLength(120).When(x => x.NewClient is not null);
        RuleFor(x => x.NewClient!.Phone).NotEmpty().MaximumLength(30).When(x => x.NewClient is not null);
        RuleFor(x => x.NewClient!.Email).EmailAddress().When(x => !string.IsNullOrEmpty(x.NewClient?.Email));
        RuleFor(x => x.InitialStatus)
            .Must(s => s is OrderStatuses.PreOrder or OrderStatuses.Pending or OrderStatuses.Confirmed)
            .WithMessage("A new order can start as Pre-Order, Pending or Confirmed.");
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
            RuleFor(x => x.RawBackupStatus), RuleFor(x => x.SelectionStatus), RuleFor(x => x.PhotoEditStatus),
            RuleFor(x => x.TeaserEditStatus), RuleFor(x => x.FullFilmEditStatus)
        })
            rule.Must(WorkStatuses.All.Contains).WithMessage("Status must be Not Started, In Progress or Completed.");

        RuleFor(x => x.SelectionMode).Must(m => m is "Client Selection" or "Studio Selection");
        RuleFor(x => x.CloudProvider).Must(p => p is "Google Drive" or "WeTransfer" or "Dropbox" or "Other")
            .When(x => !string.IsNullOrEmpty(x.CloudProvider));
        RuleFor(x => x.CloudLink).MaximumLength(500)
            .Must(l => Uri.TryCreate(l, UriKind.Absolute, out var u) && u.Scheme is "http" or "https")
            .When(x => !string.IsNullOrEmpty(x.CloudLink)).WithMessage("Enter a valid http(s) link.");
    }
}

public class CreatePaymentRequestValidator : AbstractValidator<CreatePaymentRequest>
{
    public CreatePaymentRequestValidator()
    {
        RuleFor(x => x.PaymentType).Must(PaymentTypes.All.Contains);
        RuleFor(x => x.PaymentMode).Must(PaymentTypes.Modes.Contains);
        RuleFor(x => x.Amount).GreaterThan(0).PrecisionScale(12, 2, false);
        RuleFor(x => x.TransactionRef).MaximumLength(100);
        RuleFor(x => x.Notes).MaximumLength(300);
    }
}

public class CreateExpenseRequestValidator : AbstractValidator<CreateExpenseRequest>
{
    public CreateExpenseRequestValidator()
    {
        RuleFor(x => x.Category).Must(ExpenseCategories.All.Contains);
        RuleFor(x => x.Amount).GreaterThan(0).PrecisionScale(12, 2, false);
        RuleFor(x => x.Description).MaximumLength(300);
    }
}

public abstract class AlbumRequestValidator<T> : AbstractValidator<T> where T : CreateAlbumRequest
{
    protected AlbumRequestValidator()
    {
        RuleFor(x => x.AlbumType).NotEmpty().MaximumLength(60);
        RuleFor(x => x.SheetCount).GreaterThan(0);
        RuleFor(x => x.PrintVendorName).MaximumLength(120);
        RuleFor(x => x.PrintVendorContact).MaximumLength(60);
        RuleFor(x => x.PrintCost).GreaterThanOrEqualTo(0).When(x => x.PrintCost.HasValue);
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

public class CreateDocumentRequestValidator : AbstractValidator<CreateDocumentRequest>
{
    public CreateDocumentRequestValidator()
    {
        RuleFor(x => x.DocumentType).Must(t => t is "Quotation" or "Invoice");
        RuleFor(x => x.Notes).MaximumLength(500);
    }
}

public class UpdateDocumentRequestValidator : AbstractValidator<UpdateDocumentRequest>
{
    public UpdateDocumentRequestValidator()
    {
        RuleFor(x => x.Notes).MaximumLength(500);
        RuleFor(x => x.Terms).MaximumLength(4000);
    }
}

public class SaveEventTypeRequestValidator : AbstractValidator<SaveEventTypeRequest>
{
    public SaveEventTypeRequestValidator() => RuleFor(x => x.EventTypeName).NotEmpty().MaximumLength(30);
}

public class SavePackageRequestValidator : AbstractValidator<SavePackageRequest>
{
    public SavePackageRequestValidator()
    {
        RuleFor(x => x.PackageName).NotEmpty().MaximumLength(120);
        RuleFor(x => x.BasePrice).GreaterThanOrEqualTo(0).PrecisionScale(12, 2, false);
        RuleFor(x => x.Inclusions).MaximumLength(1000);
    }
}

public class UpdateStudioSettingsRequestValidator : AbstractValidator<UpdateStudioSettingsRequest>
{
    public UpdateStudioSettingsRequestValidator()
    {
        RuleFor(x => x.StudioName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.DefaultTaxPercent).InclusiveBetween(0, 100);
        RuleFor(x => x.InvoicePrefix).Matches("^[A-Za-z]{2,10}$").WithMessage("Prefix must be 2-10 letters, e.g. INV.");
        RuleFor(x => x.QuotationPrefix).Matches("^[A-Za-z]{2,10}$").WithMessage("Prefix must be 2-10 letters, e.g. QTN.");
        RuleFor(x => x.LogoUrl).MaximumLength(300);
        RuleFor(x => x.BankDetails).MaximumLength(500);
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
